package com.sourcerating.mobile;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.UUID;

final class ApiClient {
    static final String SUPABASE_URL = "https://qnozpurjtgkmwtvsrjoi.supabase.co";
    static final String ANON_KEY = "sb_publishable_ksRD_ocrn4jnK6F2h6buFg_GzT9roS6";
    private static final String PREFS = "sr_native_session";
    private static final String K_ACCESS = "access";
    private static final String K_REFRESH = "refresh";
    private static final String K_ROLE = "role";
    private static final String K_ORG = "org";
    private static final String K_USER = "user";
    private static final String K_ROOM = "room";
    private static final int TIMEOUT_MS = 20000;
    private final SharedPreferences prefs;

    ApiClient(Context context) {
        prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    boolean hasSession() {
        return !getAccessToken().isEmpty() && !getActingOrgId().isEmpty();
    }

    String getRole() { return prefs.getString(K_ROLE, ""); }
    String getActingOrgId() { return prefs.getString(K_ORG, ""); }
    String getUserId() { return prefs.getString(K_USER, ""); }
    String getAccessToken() { return prefs.getString(K_ACCESS, ""); }
    String getLastRoomId() { return prefs.getString(K_ROOM, ""); }
    void setLastRoomId(String roomId) {
        SharedPreferences.Editor e = prefs.edit();
        if (roomId == null || roomId.trim().isEmpty()) e.remove(K_ROOM);
        else e.putString(K_ROOM, roomId.trim());
        e.apply();
    }
    void clearSession() { prefs.edit().clear().apply(); }

    JSONObject loginDemo(String role) throws Exception {
        JSONObject authReq = new JSONObject().put("role", role);
        HttpResult demo = requestRaw("POST", SUPABASE_URL + "/functions/v1/p1-demo-auth",
                authReq.toString().getBytes(StandardCharsets.UTF_8),
                "application/json", false, true,
                new String[][]{{"Origin", "https://sourcerating.com"}});
        requireOk(demo, "Demo login");
        JSONObject demoJson = new JSONObject(demo.body);
        String email = demoJson.optString("email", "");
        String password = demoJson.optString("password", "");
        if (email.isEmpty() || password.isEmpty()) throw new Exception("Demo login did not return credentials.");

        JSONObject signed = passwordSignIn(email, password);
        Object claim = rpc("claim_p1_demo_role", new JSONObject().put("p_role", role));
        String org = extractOrg(claim);
        if (org.isEmpty()) {
            org = firstNonEmpty(
                    demoJson.optString("organization_id", ""),
                    demoJson.optString("org_id", ""),
                    demoJson.optString("actor_organization_id", ""),
                    demoJson.optString("acting_org_id", "")
            );
        }
        if (org.isEmpty()) {
            JSONObject user = signed.optJSONObject("user");
            if (user != null) {
                JSONObject um = user.optJSONObject("user_metadata");
                JSONObject am = user.optJSONObject("app_metadata");
                org = firstNonEmpty(
                        um == null ? "" : um.optString("organization_id", ""),
                        um == null ? "" : um.optString("org_id", ""),
                        am == null ? "" : am.optString("organization_id", ""),
                        am == null ? "" : am.optString("org_id", "")
                );
            }
        }
        if (org.isEmpty()) throw new Exception("No acting organization was assigned.");
        prefs.edit().putString(K_ROLE, role).putString(K_ORG, org).apply();
        return signed;
    }

    JSONObject joinInvite(String token, String email, String password, String displayName) throws Exception {
        JSONObject bootstrapReq = new JSONObject()
                .put("action", "bootstrap").put("token", token).put("email", email)
                .put("password", password).put("displayName", displayName);
        HttpResult bootstrap = requestRaw("POST", SUPABASE_URL + "/functions/v1/project-invite",
                bootstrapReq.toString().getBytes(StandardCharsets.UTF_8),
                "application/json", false, false,
                new String[][]{{"Origin", "https://sourcerating.com"}});
        requireOk(bootstrap, "Invitation");
        JSONObject bootstrapJson = new JSONObject(bootstrap.body);
        if (!bootstrapJson.optBoolean("ok", false)) {
            throw new Exception(bootstrapJson.optString("error", "Unable to prepare invitation."));
        }

        JSONObject signed = passwordSignIn(email, password);
        Object claim = rpc("claim_project_invite", new JSONObject().put("p_token", token));
        String org = "";
        if (claim instanceof JSONObject) {
            org = ((JSONObject) claim).optString("acting_organization_id", "");
        } else if (claim instanceof JSONArray && ((JSONArray) claim).length() > 0) {
            JSONObject row = ((JSONArray) claim).optJSONObject(0);
            org = row == null ? "" : row.optString("acting_organization_id", "");
        }
        if (org.isEmpty()) throw new Exception("Invitation was claimed without an organization.");
        prefs.edit().putString(K_ROLE, "supplier").putString(K_ORG, org).apply();
        return signed;
    }

    JSONArray getRooms() throws Exception {
        Object value = requestJson("GET", "/rest/v1/rooms?select=*&order=created_at.asc", null, true);
        if (!(value instanceof JSONArray)) throw new Exception("Invalid rooms response.");
        return (JSONArray) value;
    }

    JSONObject getProject(String projectId) throws Exception {
        Object value = requestJson("GET",
                "/rest/v1/projects?select=id,name,code,status&id=eq." + enc(projectId) + "&limit=1",
                null, true);
        if (value instanceof JSONArray && ((JSONArray) value).length() > 0) {
            return ((JSONArray) value).getJSONObject(0);
        }
        return new JSONObject();
    }

    JSONArray getEvents(String roomId) throws Exception {
        Object value = requestJson("GET",
                "/rest/v1/room_events?select=*&room_id=eq." + enc(roomId) + "&order=seq.asc",
                null, true);
        return value instanceof JSONArray ? (JSONArray) value : new JSONArray();
    }

    JSONObject appendMessage(String roomId, String text) throws Exception {
        JSONObject body = new JSONObject()
                .put("p_room_id", roomId)
                .put("p_client_msg_id", UUID.randomUUID().toString())
                .put("p_actor_organization_id", getActingOrgId())
                .put("p_event_type", "message.posted")
                .put("p_payload", new JSONObject().put("text", text));
        Object result = rpc("append_room_event", body);
        if (result instanceof JSONObject) return (JSONObject) result;
        if (result instanceof JSONArray && ((JSONArray) result).length() > 0) {
            return ((JSONArray) result).getJSONObject(0);
        }
        return new JSONObject();
    }

    JSONObject getRoomState(String roomId) throws Exception {
        JSONObject out = new JSONObject();
        Object needs = requestJson("GET",
                "/rest/v1/needs_you?select=*&room_id=eq." + enc(roomId) +
                        "&status=eq.open&order=created_at.desc", null, true);
        Object proposals = requestJson("GET",
                "/rest/v1/staging_proposals?select=*&room_id=eq." + enc(roomId) +
                        "&status=eq.pending&order=created_at.desc", null, true);
        out.put("needs_you", needs instanceof JSONArray ? needs : new JSONArray());
        out.put("proposals", proposals instanceof JSONArray ? proposals : new JSONArray());
        return out;
    }

    JSONObject uploadAttachment(String roomId, String fileName, String mime, byte[] bytes, String caption) throws Exception {
        if (bytes.length == 0 || bytes.length > 50L * 1024L * 1024L) throw new Exception("File must be between 1 byte and 50 MB.");
        String lower = mime == null ? "" : mime.toLowerCase(Locale.US);
        boolean allowed = lower.equals("application/pdf")
                || lower.equals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                || lower.equals("application/vnd.ms-excel")
                || lower.equals("image/png")
                || lower.equals("image/jpeg");
        if (!allowed) throw new Exception("Use PDF, Excel, PNG, or JPEG.");

        String safeName = sanitizeFileName(fileName);
        String objectPath = roomId + "/" + UUID.randomUUID() + "/" + safeName;
        HttpResult upload = requestRaw(
                "POST", SUPABASE_URL + "/storage/v1/object/room-files/" + encodePath(objectPath),
                bytes, mime, true, false,
                new String[][]{{"x-upsert", "false"}, {"Cache-Control", "3600"}}
        );
        requireOk(upload, "Upload");

        JSONObject register = new JSONObject()
                .put("p_room_id", roomId)
                .put("p_object_path", objectPath)
                .put("p_file_name", safeName)
                .put("p_mime_type", mime)
                .put("p_size_bytes", bytes.length)
                .put("p_sha256", sha256(bytes))
                .put("p_actor_organization_id", getActingOrgId())
                .put("p_client_msg_id", UUID.randomUUID().toString())
                .put("p_caption", caption == null || caption.trim().isEmpty() ? JSONObject.NULL : caption.trim());
        Object result = rpc("register_room_file_version", register);
        if (result instanceof JSONObject) return (JSONObject) result;
        if (result instanceof JSONArray && ((JSONArray) result).length() > 0) return ((JSONArray) result).getJSONObject(0);
        return new JSONObject();
    }

    private JSONObject passwordSignIn(String email, String password) throws Exception {
        JSONObject body = new JSONObject().put("email", email).put("password", password);
        HttpResult result = requestRaw("POST", SUPABASE_URL + "/auth/v1/token?grant_type=password",
                body.toString().getBytes(StandardCharsets.UTF_8),
                "application/json", false, false);
        requireOk(result, "Sign in");
        JSONObject json = new JSONObject(result.body);
        saveTokenResponse(json);
        return json;
    }

    private void saveTokenResponse(JSONObject json) {
        String access = json.optString("access_token", "");
        String refresh = json.optString("refresh_token", "");
        String user = "";
        JSONObject userObj = json.optJSONObject("user");
        if (userObj != null) user = userObj.optString("id", "");
        SharedPreferences.Editor e = prefs.edit();
        if (!access.isEmpty()) e.putString(K_ACCESS, access);
        if (!refresh.isEmpty()) e.putString(K_REFRESH, refresh);
        if (!user.isEmpty()) e.putString(K_USER, user);
        e.apply();
    }

    private boolean refreshSession() {
        String refresh = prefs.getString(K_REFRESH, "");
        if (refresh.isEmpty()) return false;
        try {
            JSONObject body = new JSONObject().put("refresh_token", refresh);
            HttpResult result = requestRaw("POST", SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token",
                    body.toString().getBytes(StandardCharsets.UTF_8),
                    "application/json", false, false);
            if (result.code < 200 || result.code >= 300) return false;
            saveTokenResponse(new JSONObject(result.body));
            return !getAccessToken().isEmpty();
        } catch (Exception e) {
            return false;
        }
    }

    private Object rpc(String name, JSONObject body) throws Exception {
        return requestJson("POST", "/rest/v1/rpc/" + name, body, true);
    }

    private Object requestJson(String method, String path, JSONObject body, boolean auth) throws Exception {
        byte[] payload = body == null ? null : body.toString().getBytes(StandardCharsets.UTF_8);
        HttpResult result = requestRaw(method, SUPABASE_URL + path, payload, "application/json", auth, false);
        if (auth && result.code == 401 && refreshSession()) {
            result = requestRaw(method, SUPABASE_URL + path, payload, "application/json", true, false);
        }
        requireOk(result, "Request");
        String trimmed = result.body == null ? "" : result.body.trim();
        if (trimmed.startsWith("[")) return new JSONArray(trimmed);
        if (trimmed.startsWith("{")) return new JSONObject(trimmed);
        return trimmed;
    }

    private HttpResult requestRaw(String method, String url, byte[] body, String contentType, boolean auth, boolean anonBearer) throws Exception {
        return requestRaw(method, url, body, contentType, auth, anonBearer, null);
    }

    private HttpResult requestRaw(String method, String url, byte[] body, String contentType,
                                  boolean auth, boolean anonBearer, String[][] extraHeaders) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setRequestMethod(method);
        conn.setConnectTimeout(TIMEOUT_MS);
        conn.setReadTimeout(TIMEOUT_MS);
        conn.setRequestProperty("apikey", ANON_KEY);
        conn.setRequestProperty("Accept", "application/json");
        if (contentType != null) conn.setRequestProperty("Content-Type", contentType);
        if (auth) {
            String token = getAccessToken();
            if (!token.isEmpty()) conn.setRequestProperty("Authorization", "Bearer " + token);
        } else if (anonBearer) {
            conn.setRequestProperty("Authorization", "Bearer " + ANON_KEY);
        }
        if (extraHeaders != null) {
            for (String[] header : extraHeaders) {
                if (header != null && header.length == 2) conn.setRequestProperty(header[0], header[1]);
            }
        }
        if (body != null) {
            conn.setDoOutput(true);
            conn.setFixedLengthStreamingMode(body.length);
            try (OutputStream os = conn.getOutputStream()) { os.write(body); }
        }
        int code = conn.getResponseCode();
        InputStream stream = code >= 400 ? conn.getErrorStream() : conn.getInputStream();
        String text = stream == null ? "" : readAllText(stream);
        conn.disconnect();
        return new HttpResult(code, text);
    }

    private static void requireOk(HttpResult result, String action) throws Exception {
        if (result.code >= 200 && result.code < 300) return;
        String message = result.body;
        try {
            JSONObject j = new JSONObject(result.body);
            message = firstNonEmpty(j.optString("message", ""), j.optString("error_description", ""),
                    j.optString("error", ""), result.body);
        } catch (Exception ignored) {}
        throw new Exception(action + " failed (" + result.code + "): " + message);
    }

    private static String readAllText(InputStream in) throws Exception {
        return new String(readAllBytes(in, 4 * 1024 * 1024), StandardCharsets.UTF_8);
    }

    static byte[] readAllBytes(InputStream in, int maxBytes) throws Exception {
        try (InputStream input = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[16384];
            int total = 0;
            int n;
            while ((n = input.read(buffer)) >= 0) {
                total += n;
                if (total > maxBytes) throw new Exception("File is too large.");
                out.write(buffer, 0, n);
            }
            return out.toByteArray();
        }
    }

    private static String extractOrg(Object value) throws JSONException {
        if (value instanceof JSONArray && ((JSONArray) value).length() > 0) {
            JSONObject row = ((JSONArray) value).optJSONObject(0);
            return row == null ? "" : extractOrg(row);
        }
        if (value instanceof JSONObject) return extractOrg((JSONObject) value);
        if (value instanceof String) return (String) value;
        return "";
    }

    private static String extractOrg(JSONObject row) {
        return firstNonEmpty(row.optString("organization_id", ""), row.optString("org_id", ""),
                row.optString("actor_organization_id", ""), row.optString("acting_organization_id", ""),
                row.optString("id", ""));
    }

    private static String firstNonEmpty(String... values) {
        if (values != null) for (String v : values) if (v != null && !v.trim().isEmpty()) return v.trim();
        return "";
    }

    private static String sanitizeFileName(String input) {
        String s = input == null ? "attachment" : input.trim();
        s = s.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_");
        while (s.contains("..")) s = s.replace("..", "_");
        if (s.length() > 180) s = s.substring(0, 180);
        return s.isEmpty() ? "attachment" : s;
    }

    private static String encodePath(String path) throws Exception {
        String[] parts = path.split("/");
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            if (i > 0) out.append('/');
            out.append(URLEncoder.encode(parts[i], "UTF-8").replace("+", "%20"));
        }
        return out.toString();
    }

    private static String enc(String value) throws Exception {
        return URLEncoder.encode(value, "UTF-8").replace("+", "%20");
    }

    private static String sha256(byte[] data) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] digest = md.digest(data);
        StringBuilder sb = new StringBuilder();
        for (byte b : digest) sb.append(String.format(Locale.US, "%02x", b));
        return sb.toString();
    }

    static final class HttpResult {
        final int code;
        final String body;
        HttpResult(int code, String body) { this.code = code; this.body = body == null ? "" : body; }
    }
}
