import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import JSZip from "npm:jszip@3.10.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return hex(new Uint8Array(digest));
}

async function detectMime(buffer: ArrayBuffer): Promise<string | null> {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 5) {
    const pdf = new TextDecoder().decode(bytes.slice(0, 5));
    if (pdf === "%PDF-") return "application/pdf";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 && bytes[5] === 0xb1 && bytes[6] === 0x1a && bytes[7] === 0xe1
  ) return "application/vnd.ms-excel";
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
  ) {
    try {
      const zip = await JSZip.loadAsync(buffer);
      if (zip.file("[Content_Types].xml")) {
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      }
    } catch {
      return null;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json({ ok: false, error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ ok: false, error: "server_config_missing" }, 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ ok: false, error: "unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const action = body?.action;
  const fileVersionId = body?.fileVersionId;

  if (action === "verify" || action === "sign") {
    if (typeof fileVersionId !== "string") return json({ ok: false, error: "file_version_id_required" }, 400);

    const { data: rows, error: accessError } = await userClient.rpc(
      "get_room_file_version_for_access",
      { p_file_version_id: fileVersionId },
    );
    const file = Array.isArray(rows) ? rows[0] : rows;
    if (accessError || !file) return json({ ok: false, error: "file_access_denied" }, 403);

    if (action === "sign") {
      if (file.verification_status !== "verified") {
        return json({
          ok: false,
          error: "file_not_verified",
          verificationStatus: file.verification_status,
        }, 409);
      }

      const { data: signed, error: signedError } = await admin.storage
        .from(file.bucket_id)
        .createSignedUrl(file.object_path, 120, { download: file.logical_name });

      if (signedError || !signed?.signedUrl) {
        return json({ ok: false, error: signedError?.message || "signed_url_failed" }, 500);
      }

      await admin.from("audit_log").insert({
        actor_user_id: userData.user.id,
        actor_organization_id: file.uploader_organization_id,
        room_id: file.room_id,
        action: "file.downloaded",
        target_type: "room_file_version",
        target_id: file.id,
        metadata: { object_path: file.object_path },
      });

      return json({ ok: true, signedUrl: signed.signedUrl, expiresIn: 120 });
    }

    const { data: blob, error: downloadError } = await admin.storage
      .from(file.bucket_id)
      .download(file.object_path);
    if (downloadError || !blob) {
      await admin.from("room_file_versions").update({
        verification_status: "verification_failed",
        verification_error: downloadError?.message || "download_failed",
      }).eq("id", file.id);
      return json({ ok: false, error: "download_failed" }, 500);
    }

    const buffer = await blob.arrayBuffer();
    const serverSha256 = await sha256Hex(buffer);
    const detectedMime = await detectMime(buffer);
    const clientSha = (file.client_sha256 || file.sha256 || "").toLowerCase();

    let status = "verified";
    let verificationError: string | null = null;

    if (!detectedMime) {
      status = "quarantined";
      verificationError = "unsupported_or_invalid_file_signature";
    } else if (detectedMime !== file.mime_type) {
      status = "quarantined";
      verificationError = "mime_signature_mismatch";
    } else if (clientSha && serverSha256 !== clientSha) {
      status = "hash_mismatch";
      verificationError = "client_server_hash_mismatch";
    }

    const { error: updateError } = await admin.from("room_file_versions").update({
      verification_status: status,
      server_sha256: serverSha256,
      detected_mime_type: detectedMime,
      verified_at: new Date().toISOString(),
      verification_error: verificationError,
    }).eq("id", file.id);

    if (updateError) return json({ ok: false, error: "verification_update_failed" }, 500);

    await admin.from("audit_log").insert({
      actor_user_id: userData.user.id,
      actor_organization_id: file.uploader_organization_id,
      room_id: file.room_id,
      action: status === "verified" ? "file.verified" : "file.quarantined",
      target_type: "room_file_version",
      target_id: file.id,
      metadata: {
        object_path: file.object_path,
        server_sha256: serverSha256,
        detected_mime_type: detectedMime,
        verification_error: verificationError,
      },
    });

    return json({
      ok: status === "verified",
      verificationStatus: status,
      serverSha256,
      detectedMimeType: detectedMime,
      error: verificationError,
    }, status === "verified" ? 200 : 422);
  }

  if (action === "cleanup_orphan") {
    const objectPath = body?.objectPath;
    const roomId = body?.roomId;
    if (typeof objectPath !== "string" || typeof roomId !== "string") {
      return json({ ok: false, error: "object_path_and_room_required" }, 400);
    }

    const { data: room, error: roomError } = await userClient
      .from("rooms")
      .select("id")
      .eq("id", roomId)
      .maybeSingle();
    if (roomError || !room) return json({ ok: false, error: "room_access_denied" }, 403);

    const { data: existing } = await admin
      .from("room_file_versions")
      .select("id")
      .eq("object_path", objectPath)
      .maybeSingle();
    if (existing) return json({ ok: false, error: "object_already_registered" }, 409);

    const { data: objects, error: objectError } = await admin
      .schema("storage")
      .from("objects")
      .select("owner_id,name")
      .eq("bucket_id", "room-files")
      .eq("name", objectPath)
      .limit(1);

    const object = Array.isArray(objects) ? objects[0] : null;
    if (objectError || !object || object.owner_id !== userData.user.id) {
      return json({ ok: false, error: "orphan_not_owned" }, 403);
    }

    const { error: removeError } = await admin.storage
      .from("room-files")
      .remove([objectPath]);
    if (removeError) return json({ ok: false, error: "cleanup_failed" }, 500);

    return json({ ok: true });
  }

  return json({ ok: false, error: "invalid_action" }, 400);
});
