package com.sourcerating.mobile;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.database.Cursor;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.OpenableColumns;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.inputmethod.InputMethodManager;
import android.widget.ArrayAdapter;
import android.widget.BaseAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity {
    private static final int PICK_FILE = 7401;
    private static final int SAVE_FILE = 7402;
    private String downloadFileId;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ArrayList<JSONObject> rooms = new ArrayList<>();
    private final ArrayList<JSONObject> events = new ArrayList<>();
    private ApiClient api;
    private boolean inApp = false;
    private boolean refreshInFlight = false;
    private int activeRoomIndex = 0;
    private TextView projectTitle;
    private TextView roomTitle;
    private TextView statusText;
    private ListView messageList;
    private MessageAdapter messageAdapter;
    private EditText composer;
    private ArrayAdapter<String> roomSpinnerAdapter;
    private Spinner roomSpinner;
    private ArrayAdapter<String> roomListAdapter;
    private ListView roomList;
    private JSONArray needsYou = new JSONArray();
    private JSONArray proposals = new JSONArray();

    private final Runnable poll = new Runnable() {
        @Override public void run() {
            if (inApp && api != null && api.hasSession()) {
                refreshActiveRoom(false);
                main.postDelayed(this, 3000);
            }
        }
    };

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        api = new ApiClient(this);
        Window w = getWindow();
        w.setStatusBarColor(Color.rgb(15, 23, 42));
        w.setNavigationBarColor(Color.rgb(15, 23, 42));
        if (api.hasSession()) showApp(); else showLogin();
    }

    @Override protected void onResume() {
        super.onResume();
        if (inApp) { main.removeCallbacks(poll); main.postDelayed(poll, 1200); }
    }

    @Override protected void onPause() {
        main.removeCallbacks(poll);
        super.onPause();
    }

    @Override protected void onDestroy() {
        main.removeCallbacksAndMessages(null);
        io.shutdownNow();
        super.onDestroy();
    }

    private void showLogin() {
        inApp = false;
        main.removeCallbacks(poll);
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(bg());
        LinearLayout root = column();
        root.setPadding(dp(24), dp(34), dp(24), dp(34));
        scroll.addView(root, matchWrap());

        root.addView(text("SourceRating", 30, Color.WHITE, true), matchWrap());
        root.addView(text("Native Project Room pilot\nSame SourceRating backend, no embedded website.", 14, muted(), false), topMargin(8));
        root.addView(sectionLabel("SIGN IN"), topMargin(28));
        EditText loginEmail = input("Sign-in email", false);
        loginEmail.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        EditText loginPassword = input("Sign-in password", true);
        root.addView(loginEmail, topMargin(10));
        root.addView(loginPassword, topMargin(10));
        Button signIn = primaryButton("Sign in");
        root.addView(signIn, topMargin(10));
        signIn.setOnClickListener(v -> {
            String e = loginEmail.getText().toString().trim();
            String pw = loginPassword.getText().toString();
            if (e.isEmpty() || pw.isEmpty()) { toast("Enter your email and password."); return; }
            setButtonBusy(signIn, true, "Signing in...");
            io.execute(() -> {
                try {
                    api.loginWithPassword(e, pw);
                    main.post(this::showApp);
                } catch (Exception ex) {
                    main.post(() -> { setButtonBusy(signIn, false, "Sign in"); showError("Sign in failed", ex.getMessage()); });
                }
            });
        });

        root.addView(sectionLabel("JOIN BY INVITATION"), topMargin(30));
        EditText token = input("Invitation token", false);
        EditText name = input("Your name", false);
        EditText email = input("Email", false);
        EditText password = input("Password (10+ characters)", true);
        root.addView(token, topMargin(10));
        root.addView(name, topMargin(10));
        root.addView(email, topMargin(10));
        root.addView(password, topMargin(10));

        Button join = primaryButton("Join Project Room");
        root.addView(join, topMargin(14));
        join.setOnClickListener(v -> {
            String t = token.getText().toString().trim();
            String e = email.getText().toString().trim();
            String pw = password.getText().toString();
            String dn = name.getText().toString().trim();
            if (t.isEmpty() || e.isEmpty() || pw.length() < 10) {
                toast("Enter token, email, and a 10+ character password.");
                return;
            }
            setButtonBusy(join, true, "Joining...");
            io.execute(() -> {
                try {
                    api.joinInvite(t, e, pw, dn);
                    main.post(this::showApp);
                } catch (Exception ex) {
                    main.post(() -> {
                        setButtonBusy(join, false, "Join Project Room");
                        showError("Unable to join", ex.getMessage());
                    });
                }
            });
        });
        root.addView(text("Invitation access uses the same Supabase RLS policies as the web app.", 12, muted(), false), topMargin(16));
        setContentView(scroll);
        applySystemInsets(scroll);
    }

    private void showApp() {
        inApp = true;
        rooms.clear(); events.clear(); activeRoomIndex = 0;
        LinearLayout app = column();
        app.setBackgroundColor(bg());
        app.setFocusableInTouchMode(true);

        LinearLayout top = row();
        top.setGravity(Gravity.CENTER_VERTICAL);
        top.setPadding(dp(16), dp(10), dp(12), dp(10));
        top.setBackgroundColor(panel());
        top.addView(text("SourceRating", 19, Color.WHITE, true), new LinearLayout.LayoutParams(0, dp(48), 1f));
        Button stateButton = compactButton("State");
        top.addView(stateButton, new LinearLayout.LayoutParams(dp(72), dp(42)));
        Button logout = compactButton("Logout");
        LinearLayout.LayoutParams logoutLp = new LinearLayout.LayoutParams(dp(78), dp(42));
        logoutLp.leftMargin = dp(8);
        top.addView(logout, logoutLp);
        app.addView(top, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(68)));

        boolean wide = getResources().getConfiguration().screenWidthDp >= 720;
        if (wide) {
            LinearLayout body = row();
            body.addView(buildWideSidebar(), new LinearLayout.LayoutParams(dp(270), ViewGroup.LayoutParams.MATCH_PARENT));
            body.addView(buildRoomPane(false), new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f));
            app.addView(body, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        } else {
            app.addView(buildRoomPane(true), new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        }

        stateButton.setOnClickListener(v -> showStateDialog());
        logout.setOnClickListener(v -> { api.clearSession(); showLogin(); });
        setContentView(app);
        app.requestFocus();
        applySystemInsets(app);
        loadRooms();
        main.removeCallbacks(poll);
        main.postDelayed(poll, 1800);
    }

    private View buildWideSidebar() {
        LinearLayout side = column();
        side.setPadding(dp(12), dp(14), dp(12), dp(14));
        side.setBackgroundColor(Color.rgb(8, 15, 28));
        side.addView(sectionLabel("PROJECT ROOMS"), matchWrap());
        roomList = new ListView(this);
        roomList.setDividerHeight(0);
        roomList.setBackgroundColor(Color.TRANSPARENT);
        roomListAdapter = new ArrayAdapter<String>(this, android.R.layout.simple_list_item_1, new ArrayList<String>()) {
            @Override public View getView(int position, View convertView, ViewGroup parent) {
                TextView v = (TextView) super.getView(position, convertView, parent);
                v.setTextColor(Color.rgb(226, 232, 240));
                v.setTextSize(14);
                v.setPadding(dp(12), dp(10), dp(8), dp(10));
                v.setBackground(position == activeRoomIndex ? roundRect(Color.rgb(30, 58, 83), 10) : null);
                return v;
            }
        };
        roomList.setAdapter(roomListAdapter);
        roomList.setOnItemClickListener((parent, view, position, id) -> switchRoom(position));
        side.addView(roomList, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        side.addView(text("Signed in as " + api.getRole(), 12, muted(), false), topMargin(8));
        return side;
    }

    private View buildRoomPane(boolean narrow) {
        LinearLayout pane = column();
        pane.setBackgroundColor(bg());
        LinearLayout header = column();
        header.setPadding(dp(16), dp(12), dp(16), dp(10));
        header.setBackgroundColor(Color.rgb(10, 18, 32));
        projectTitle = text("Loading project…", 12, accent(), true);
        roomTitle = text("Project Room", 19, Color.WHITE, true);
        statusText = text(networkSummary(), 12, muted(), false);
        header.addView(projectTitle, matchWrap());
        header.addView(roomTitle, topMargin(4));
        header.addView(statusText, topMargin(4));

        if (narrow) {
            roomSpinner = new Spinner(this);
            roomSpinnerAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, new ArrayList<>());
            roomSpinner.setAdapter(roomSpinnerAdapter);
            roomSpinner.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener() {
                boolean first = true;
                @Override public void onItemSelected(android.widget.AdapterView<?> parent, View view, int pos, long id) {
                    if (first) { first = false; return; }
                    if (pos != activeRoomIndex) switchRoom(pos);
                }
                @Override public void onNothingSelected(android.widget.AdapterView<?> parent) {}
            });
            header.addView(roomSpinner, topMargin(8));
        }
        pane.addView(header, matchWrap());

        messageList = new ListView(this);
        messageList.setDividerHeight(0);
        messageList.setTranscriptMode(ListView.TRANSCRIPT_MODE_NORMAL);
        messageAdapter = new MessageAdapter();
        messageList.setAdapter(messageAdapter);
        messageList.setOnItemClickListener((parent, view, position, id) -> {
            JSONObject payload = events.get(position).optJSONObject("payload");
            if (payload != null && "file.attached".equals(events.get(position).optString("event_type"))) {
                showFileDialog(payload.optString("file_version_id", ""));
            }
        });
        pane.addView(messageList, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        LinearLayout composerBar = row();
        composerBar.setGravity(Gravity.BOTTOM);
        composerBar.setPadding(dp(10), dp(8), dp(10), dp(10));
        composerBar.setBackgroundColor(panel());
        Button attach = compactButton("+");
        composerBar.addView(attach, new LinearLayout.LayoutParams(dp(50), dp(50)));
        composer = new EditText(this);
        composer.setHint("Message…");
        composer.setHintTextColor(Color.rgb(100, 116, 139));
        composer.setTextColor(Color.WHITE);
        composer.setTextSize(15);
        composer.setSingleLine(false);
        composer.setMaxLines(5);
        composer.setPadding(dp(12), dp(8), dp(12), dp(8));
        composer.setBackground(roundRect(Color.rgb(20, 31, 49), 12));
        LinearLayout.LayoutParams inputLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        inputLp.leftMargin = dp(8);
        composerBar.addView(composer, inputLp);
        Button send = primaryButton("Send");
        LinearLayout.LayoutParams sendLp = new LinearLayout.LayoutParams(dp(78), dp(50));
        sendLp.leftMargin = dp(8);
        composerBar.addView(send, sendLp);
        pane.addView(composerBar, matchWrap());
        send.setOnClickListener(v -> sendMessage(send));
        attach.setOnClickListener(v -> pickFile());
        return pane;
    }

    // Keep Android 15 system bars out of the interactive header/composer.
    private void applySystemInsets(View root) {
        final int left = root.getPaddingLeft(), top = root.getPaddingTop();
        final int right = root.getPaddingRight(), bottom = root.getPaddingBottom();
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(left + insets.getSystemWindowInsetLeft(),
                    top + insets.getSystemWindowInsetTop(),
                    right + insets.getSystemWindowInsetRight(),
                    bottom + insets.getSystemWindowInsetBottom());
            return insets;
        });
        root.requestApplyInsets();
    }

    private void loadRooms() {
        setStatus("Connecting to SourceRating…");
        io.execute(() -> {
            try {
                JSONArray array = api.getRooms();
                ArrayList<JSONObject> loaded = new ArrayList<>();
                for (int i = 0; i < array.length(); i++) {
                    JSONObject room = array.optJSONObject(i);
                    if (room == null) continue;
                    loaded.add(room);
                }
                main.post(() -> {
                    rooms.clear();
                    rooms.addAll(loaded);
                    activeRoomIndex = 0;
                    String savedRoomId = api.getLastRoomId();
                    if (!savedRoomId.isEmpty()) {
                        for (int i = 0; i < rooms.size(); i++) {
                            if (savedRoomId.equals(rooms.get(i).optString("id", ""))) {
                                activeRoomIndex = i;
                                break;
                            }
                        }
                    }
                    if (!rooms.isEmpty()) {
                        String selectedRoomId = rooms.get(activeRoomIndex).optString("id", "");
                        if (!selectedRoomId.isEmpty()) api.setLastRoomId(selectedRoomId);
                    }
                    updateRoomSelectors();
                    if (rooms.isEmpty()) { setStatus("No accessible rooms."); return; }
                    refreshActiveRoom(true);
                });
            } catch (Exception ex) {
                main.post(() -> setStatus("Offline — " + cleanError(ex)));
            }
        });
    }

    private void updateRoomSelectors() {
        ArrayList<String> labels = new ArrayList<>();
        for (JSONObject r : rooms) labels.add(r.optString("name", "Room"));
        if (roomSpinnerAdapter != null) {
            roomSpinnerAdapter.clear(); roomSpinnerAdapter.addAll(labels); roomSpinnerAdapter.notifyDataSetChanged();
            if (!labels.isEmpty()) roomSpinner.setSelection(Math.min(activeRoomIndex, labels.size() - 1));
        }
        if (roomListAdapter != null) {
            roomListAdapter.clear(); roomListAdapter.addAll(labels); roomListAdapter.notifyDataSetChanged();
        }
        updateHeaderFromRoom();
    }

    private void switchRoom(int position) {
        if (position < 0 || position >= rooms.size()) return;
        activeRoomIndex = position;
        String roomId = rooms.get(position).optString("id", "");
        if (!roomId.isEmpty()) api.setLastRoomId(roomId);
        events.clear(); needsYou = new JSONArray(); proposals = new JSONArray();
        if (messageAdapter != null) messageAdapter.notifyDataSetChanged();
        updateRoomSelectors();
        refreshActiveRoom(true);
    }

    private JSONObject activeRoom() {
        return activeRoomIndex >= 0 && activeRoomIndex < rooms.size() ? rooms.get(activeRoomIndex) : null;
    }

    private void updateHeaderFromRoom() {
        JSONObject room = activeRoom();
        if (roomTitle != null) roomTitle.setText(room == null ? "Project Room" : room.optString("name", "Project Room"));
    }

    private void refreshActiveRoom(boolean forceScroll) {
        JSONObject room = activeRoom();
        if (room == null || refreshInFlight) return;
        refreshInFlight = true;
        String roomId = room.optString("id", "");
        String projectId = room.optString("project_id", "");
        io.execute(() -> {
            try {
                JSONArray newEvents = api.getEvents(roomId);
                JSONObject state = api.getRoomState(roomId);
                JSONObject project = projectId.isEmpty() ? new JSONObject() : api.getProject(projectId);
                main.post(() -> {
                    events.clear();
                    for (int i = 0; i < newEvents.length(); i++) {
                        JSONObject e = newEvents.optJSONObject(i); if (e != null) events.add(e);
                    }
                    needsYou = state.optJSONArray("needs_you"); if (needsYou == null) needsYou = new JSONArray();
                    proposals = state.optJSONArray("proposals"); if (proposals == null) proposals = new JSONArray();
                    if (messageAdapter != null) messageAdapter.notifyDataSetChanged();
                    if (projectTitle != null) {
                        String n = project.optString("name", "Project");
                        String c = project.optString("code", "");
                        projectTitle.setText(c.isEmpty() ? n : n + "  ·  " + c);
                    }
                    setStatus(stateSummary());
                    if ((forceScroll || isNearBottom()) && messageList != null && !events.isEmpty()) {
                        messageList.setSelection(events.size() - 1);
                    }
                    refreshInFlight = false;
                });
            } catch (Exception ex) {
                main.post(() -> { setStatus("Offline — retrying automatically"); refreshInFlight = false; });
            }
        });
    }

    private void sendMessage(Button send) {
        JSONObject room = activeRoom();
        String text = composer == null ? "" : composer.getText().toString().trim();
        if (room == null || text.isEmpty()) return;
        String roomId = room.optString("id", "");
        composer.setText("");
        setButtonBusy(send, true, "…");
        setStatus("Sending…");
        io.execute(() -> {
            try {
                api.appendMessage(roomId, text);
                main.post(() -> { setButtonBusy(send, false, "Send"); refreshActiveRoom(true); });
            } catch (Exception ex) {
                main.post(() -> {
                    setButtonBusy(send, false, "Send");
                    composer.setText(text);
                    String errorMessage = cleanError(ex);
                    setStatus("Send failed — " + errorMessage);
                    showError("Message not sent", errorMessage);
                });
            }
        });
    }

    private void hideComposerKeyboard() {
        // A focused editor can reopen the keyboard when DocumentsUI returns.
        View content = findViewById(android.R.id.content);
        content.setFocusableInTouchMode(true);
        content.requestFocus();
        InputMethodManager keyboard = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
        if (composer != null && keyboard != null) {
            keyboard.hideSoftInputFromWindow(composer.getWindowToken(), 0);
        }
    }

    private void pickFile() {
        if (activeRoom() == null) return;
        hideComposerKeyboard();
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                "application/pdf",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-excel",
                "image/png",
                "image/jpeg"
        });
        startActivityForResult(intent, PICK_FILE);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PICK_FILE || requestCode == SAVE_FILE) hideComposerKeyboard();
        if (requestCode == SAVE_FILE) {
            String fileId = downloadFileId;
            downloadFileId = null;
            if (resultCode != RESULT_OK || data == null || data.getData() == null || fileId == null) return;
            Uri target = data.getData();
            setStatus("Downloading…");
            io.execute(() -> {
                try {
                    byte[] bytes = api.downloadFile(fileId);
                    try (OutputStream out = getContentResolver().openOutputStream(target)) {
                        if (out == null) throw new Exception("Cannot write the selected document.");
                        out.write(bytes);
                    }
                    main.post(() -> { toast("Downloaded; SHA-256 matches server bytes"); refreshActiveRoom(false); });
                } catch (Exception ex) {
                    main.post(() -> showError("Download failed", cleanError(ex)));
                }
            });
            return;
        }
        if (requestCode != PICK_FILE || resultCode != RESULT_OK || data == null || data.getData() == null) return;
        Uri uri = data.getData();
        JSONObject room = activeRoom();
        if (room == null) return;
        String roomId = room.optString("id", "");
        String name = queryDisplayName(uri);
        String mime = getContentResolver().getType(uri);
        if (mime == null) mime = inferMime(name);
        final String finalMime = mime;
        setStatus("Uploading " + name + "…");
        io.execute(() -> {
            try {
                byte[] bytes;
                try (InputStream in = getContentResolver().openInputStream(uri)) {
                    if (in == null) throw new Exception("Cannot read selected file.");
                    bytes = ApiClient.readAllBytes(in, 50 * 1024 * 1024 + 1);
                }
                api.uploadAttachment(roomId, name, finalMime, bytes, "");
                main.post(() -> { toast("Attachment uploaded"); refreshActiveRoom(true); });
            } catch (Exception ex) {
                main.post(() -> setStatus("Upload failed — " + cleanError(ex)));
            }
        });
    }

    private void showFileDialog(String fileId) {
        if (fileId.isEmpty()) return;
        io.execute(() -> {
            try {
                JSONObject file = api.getFile(fileId);
                String status = file.optString("verification_status", "pending");
                String detail = "Version " + file.optInt("version_no") + "\nServer check: " + status
                        + "\nDetected type: " + file.optString("detected_mime_type", "not checked")
                        + "\nServer SHA-256: " + file.optString("server_sha256", "not checked")
                        + "\n\nChecks compare byte count, SHA-256 and detected file type. They do not certify document contents or scan for malware.";
                main.post(() -> {
                    AlertDialog.Builder dialog = new AlertDialog.Builder(this).setTitle(file.optString("logical_name", "Attachment"))
                            .setMessage(detail).setNegativeButton("Close", null);
                    if ("verified".equals(status)) {
                        dialog.setPositiveButton("Download", (d, which) -> {
                            downloadFileId = fileId;
                            Intent save = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                                    .setType(file.optString("mime_type", "application/octet-stream"))
                                    .putExtra(Intent.EXTRA_TITLE, file.optString("logical_name", "attachment"));
                            startActivityForResult(save, SAVE_FILE);
                        });
                    } else if ("pending".equals(status)) {
                        dialog.setPositiveButton("Retry check", (d, which) -> io.execute(() -> {
                            try { api.verifyFile(fileId); showFileDialog(fileId); }
                            catch (Exception ex) { main.post(() -> showError("Check failed", cleanError(ex))); }
                        }));
                    }
                    dialog.show();
                });
            } catch (Exception ex) { main.post(() -> showError("File unavailable", cleanError(ex))); }
        });
    }

    private void showStateDialog() {
        StringBuilder sb = new StringBuilder();
        sb.append("Needs You: ").append(needsYou == null ? 0 : needsYou.length()).append("\n");
        if (needsYou != null) {
            for (int i = 0; i < needsYou.length(); i++) {
                JSONObject n = needsYou.optJSONObject(i);
                if (n != null) {
                    sb.append("\n• ").append(n.optString("title", "Action required"));
                    String detail = n.optString("detail", "");
                    if (!detail.isEmpty()) sb.append("\n  ").append(detail);
                }
            }
        }
        sb.append("\n\nAI proposals: ").append(proposals == null ? 0 : proposals.length()).append("\n");
        if (proposals != null) {
            for (int i = 0; i < proposals.length(); i++) {
                JSONObject p = proposals.optJSONObject(i);
                if (p != null) {
                    sb.append("\n• ").append(p.optString("proposal_type", "proposal"));
                    JSONObject payload = p.optJSONObject("payload");
                    if (payload != null) {
                        String summary = firstNonEmpty(payload.optString("summary", ""), payload.optString("description", ""),
                                payload.optString("title", ""), payload.optString("text", ""));
                        if (!summary.isEmpty()) sb.append("\n  ").append(summary);
                    }
                }
            }
        }
        TextView body = text(sb.toString(), 14, Color.rgb(30, 41, 59), false);
        body.setPadding(dp(18), dp(8), dp(18), dp(8));
        body.setTextIsSelectable(true);
        ScrollView sc = new ScrollView(this); sc.addView(body);
        new AlertDialog.Builder(this).setTitle("Project State").setView(sc).setPositiveButton("Close", null).show();
    }

    private boolean isNearBottom() {
        if (messageList == null || messageAdapter == null || messageAdapter.getCount() == 0) return true;
        return messageList.getLastVisiblePosition() >= messageAdapter.getCount() - 3;
    }

    private String stateSummary() {
        return (isOnline() ? "Online" : "Offline") + "  ·  Needs You " +
                (needsYou == null ? 0 : needsYou.length()) + "  ·  AI proposals " +
                (proposals == null ? 0 : proposals.length()) + "  ·  polling 3s";
    }

    private String networkSummary() { return isOnline() ? "Online" : "Offline"; }

    private boolean isOnline() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
            Network n = cm.getActiveNetwork();
            if (n == null) return false;
            NetworkCapabilities c = cm.getNetworkCapabilities(n);
            return c != null && c.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
        } catch (Exception e) { return true; }
    }

    private void setStatus(String value) { if (statusText != null) statusText.setText(value); }

    private String queryDisplayName(Uri uri) {
        String result = "attachment";
        Cursor c = null;
        try {
            c = getContentResolver().query(uri, null, null, null, null);
            if (c != null && c.moveToFirst()) {
                int idx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (idx >= 0) result = c.getString(idx);
            }
        } catch (Exception ignored) {
        } finally { if (c != null) c.close(); }
        return result == null || result.trim().isEmpty() ? "attachment" : result;
    }

    private static String inferMime(String name) {
        String n = name == null ? "" : name.toLowerCase(Locale.US);
        if (n.endsWith(".pdf")) return "application/pdf";
        if (n.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        if (n.endsWith(".xls")) return "application/vnd.ms-excel";
        if (n.endsWith(".png")) return "image/png";
        if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
        return "application/octet-stream";
    }

    private final class MessageAdapter extends BaseAdapter {
        @Override public int getCount() { return events.size(); }
        @Override public Object getItem(int position) { return events.get(position); }
        @Override public long getItemId(int position) { return position; }

        @Override public View getView(int position, View convertView, ViewGroup parent) {
            JSONObject event = events.get(position);
            LinearLayout outer = column();
            outer.setPadding(dp(12), dp(5), dp(12), dp(5));
            String actorId = event.optString("actor_user_id", "");
            boolean mine = !api.getUserId().isEmpty() && api.getUserId().equals(actorId);
            LinearLayout bubble = column();
            bubble.setPadding(dp(12), dp(9), dp(12), dp(9));
            bubble.setBackground(roundRect(mine ? Color.rgb(13, 78, 105) : Color.rgb(30, 41, 59), 14));

            String type = event.optString("event_type", "");
            JSONObject payload = event.optJSONObject("payload");
            String body;
            if ("message.posted".equals(type)) {
                body = payload == null ? "" : payload.optString("text", "");
            } else if ("file.attached".equals(type)) {
                String fn = payload == null ? "" : firstNonEmpty(payload.optString("file_name", ""),
                        payload.optString("logical_name", ""), payload.optString("name", ""));
                body = "📎 " + (fn.isEmpty() ? "Attachment" : fn);
                body += "  ·  v" + (payload == null ? 1 : payload.optInt("version_no", 1));
                String cap = payload == null || payload.isNull("caption") ? "" : payload.optString("caption", "");
                if ("null".equalsIgnoreCase(cap)) cap = "";
                if (!cap.isEmpty()) body += "\n" + cap;
            } else {
                body = type.isEmpty() ? "Project event" : type;
            }
            bubble.addView(text(body, 15, Color.WHITE, false), matchWrap());
            String actorName = event.optString("actor_display_name", "");
            if (actorName.isEmpty() || actorName.equals("null")) {
                actorName = "Member " + actorId.substring(0, Math.min(8, actorId.length()));
            }
            String meta = (mine ? "You" : actorName) + "  ·  #" + event.optLong("seq", 0);
            String time = shortTime(event.optString("created_at", ""));
            if (!time.isEmpty()) meta += "  ·  " + time;
            bubble.addView(text(meta, 11, Color.rgb(148, 163, 184), false), topMargin(5));
            LinearLayout.LayoutParams bubbleLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            bubbleLp.gravity = mine ? Gravity.END : Gravity.START;
            bubbleLp.leftMargin = mine ? dp(54) : 0;
            bubbleLp.rightMargin = mine ? 0 : dp(54);
            outer.addView(bubble, bubbleLp);
            return outer;
        }
    }

    private static String shortTime(String iso) {
        if (iso == null || iso.length() < 16) return "";
        try { return iso.substring(11, 16); } catch (Exception e) { return ""; }
    }

    private EditText input(String hint, boolean password) {
        EditText e = new EditText(this);
        e.setHint(hint); e.setHintTextColor(Color.rgb(100, 116, 139)); e.setTextColor(Color.WHITE);
        e.setTextSize(15); e.setSingleLine(true); e.setPadding(dp(14), 0, dp(14), 0);
        e.setBackground(roundRect(Color.rgb(20, 31, 49), 12)); e.setMinHeight(dp(52));
        if (password) e.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD);
        return e;
    }

    private Button primaryButton(String label) {
        Button b = new Button(this);
        b.setText(label); b.setTextColor(Color.rgb(2, 6, 23)); b.setTextSize(14); b.setAllCaps(false);
        b.setBackground(roundRect(Color.rgb(56, 189, 248), 12));
        return b;
    }

    private Button secondaryButton(String label) {
        Button b = new Button(this);
        b.setText(label); b.setTextColor(Color.WHITE); b.setTextSize(14); b.setAllCaps(false);
        b.setBackground(roundRect(Color.rgb(30, 41, 59), 12));
        return b;
    }

    private Button compactButton(String label) {
        Button b = secondaryButton(label); b.setPadding(dp(6), 0, dp(6), 0); b.setTextSize(12); return b;
    }

    private TextView sectionLabel(String value) {
        TextView t = text(value, 12, accent(), true); t.setLetterSpacing(0.12f); return t;
    }

    private TextView text(String value, int sp, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(value); t.setTextSize(sp); t.setTextColor(color);
        if (bold) t.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        return t;
    }

    private LinearLayout column() { LinearLayout l = new LinearLayout(this); l.setOrientation(LinearLayout.VERTICAL); return l; }
    private LinearLayout row() { LinearLayout l = new LinearLayout(this); l.setOrientation(LinearLayout.HORIZONTAL); return l; }
    private LinearLayout.LayoutParams matchWrap() { return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT); }
    private LinearLayout.LayoutParams topMargin(int marginDp) { LinearLayout.LayoutParams p = matchWrap(); p.topMargin = dp(marginDp); return p; }

    private GradientDrawable roundRect(int color, int radiusDp) {
        GradientDrawable d = new GradientDrawable(); d.setColor(color); d.setCornerRadius(dp(radiusDp)); return d;
    }

    private void setButtonBusy(Button b, boolean busy, String text) {
        b.setEnabled(!busy); b.setText(text); b.setAlpha(busy ? 0.65f : 1f);
    }

    private void showError(String title, String detail) {
        new AlertDialog.Builder(this).setTitle(title).setMessage(detail == null ? "Unknown error" : detail).setPositiveButton("OK", null).show();
    }

    private void toast(String s) { Toast.makeText(this, s, Toast.LENGTH_SHORT).show(); }

    private String cleanError(Exception ex) {
        String m = ex == null ? "Unknown error" : ex.getMessage();
        if (m == null) return "Unknown error";
        return m.length() > 140 ? m.substring(0, 140) + "…" : m;
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private int bg() { return Color.rgb(2, 6, 23); }
    private int panel() { return Color.rgb(15, 23, 42); }
    private int muted() { return Color.rgb(148, 163, 184); }
    private int accent() { return Color.rgb(56, 189, 248); }

    private static String firstNonEmpty(String... values) {
        if (values != null) for (String v : values) if (v != null && !v.trim().isEmpty()) return v.trim();
        return "";
    }
}
