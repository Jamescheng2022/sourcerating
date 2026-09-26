import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { unzipSync } from "https://esm.sh/fflate@0.8.2";

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

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function starts(bytes: Uint8Array, sig: number[]): boolean {
  if (bytes.length < sig.length) return false;
  return sig.every((b, i) => bytes[i] === b);
}

function detectMime(bytes: Uint8Array, declared: string): { ok: boolean; detected: string; reason?: string } {
  if (starts(bytes, [0x25,0x50,0x44,0x46,0x2d])) {
    return { ok: declared === "application/pdf", detected: "application/pdf", reason: declared === "application/pdf" ? undefined : "declared_mime_mismatch" };
  }
  if (starts(bytes, [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])) {
    return { ok: declared === "image/png", detected: "image/png", reason: declared === "image/png" ? undefined : "declared_mime_mismatch" };
  }
  if (starts(bytes, [0xff,0xd8,0xff])) {
    return { ok: declared === "image/jpeg", detected: "image/jpeg", reason: declared === "image/jpeg" ? undefined : "declared_mime_mismatch" };
  }
  if (starts(bytes, [0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1])) {
    const ok = declared === "application/vnd.ms-excel";
    return { ok, detected: "application/vnd.ms-excel", reason: ok ? undefined : "declared_mime_mismatch" };
  }
  if (starts(bytes, [0x50,0x4b,0x03,0x04])) {
    try {
      const files = unzipSync(bytes);
      const isXlsx = Object.prototype.hasOwnProperty.call(files, "[Content_Types].xml")
        && Object.keys(files).some((name) => name.startsWith("xl/"));
      if (isXlsx) {
        const detected = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        const ok = declared === detected;
        return { ok, detected, reason: ok ? undefined : "declared_mime_mismatch" };
      }
    } catch {
      return { ok: false, detected: "application/zip", reason: "invalid_zip" };
    }
  }
  return { ok: false, detected: "application/octet-stream", reason: "unsupported_file_signature" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok:false, error:"method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ ok:false, error:"unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const fileVersionId = body?.fileVersionId;
  if (typeof fileVersionId !== "string") return json({ ok:false, error:"invalid_file_version_id" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ ok:false, error:"server_config_missing" }, 500);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: record, error: recordError } = await userClient
    .from("room_file_versions")
    .select("id,room_id,bucket_id,object_path,mime_type,size_bytes,sha256,verification_status")
    .eq("id", fileVersionId)
    .maybeSingle();

  if (recordError || !record) return json({ ok:false, error:"file_not_found_or_forbidden" }, 403);

  if (record.verification_status === "verified") {
    return json({ ok:true, status:"verified", serverSha256: record.sha256, detectedMimeType: record.mime_type });
  }

  const { data: blob, error: downloadError } = await admin.storage
    .from(record.bucket_id)
    .download(record.object_path);

  if (downloadError || !blob) {
    await admin.from("room_file_versions").update({
      verification_status: "rejected",
      rejection_reason: "storage_download_failed",
      verified_at: new Date().toISOString(),
    }).eq("id", record.id);
    return json({ ok:false, status:"rejected", error:"storage_download_failed" }, 500);
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.byteLength !== Number(record.size_bytes)) {
    await admin.from("room_file_versions").update({
      verification_status: "rejected",
      rejection_reason: "size_mismatch",
      verified_at: new Date().toISOString(),
    }).eq("id", record.id);
    return json({ ok:false, status:"rejected", error:"size_mismatch" }, 422);
  }

  const serverSha256 = hex(await crypto.subtle.digest("SHA-256", bytes));
  const detected = detectMime(bytes, record.mime_type);

  if (serverSha256 !== String(record.sha256).toLowerCase() || !detected.ok) {
    const reason = serverSha256 !== String(record.sha256).toLowerCase()
      ? "sha256_mismatch"
      : detected.reason || "file_signature_rejected";

    await admin.from("room_file_versions").update({
      verification_status: "rejected",
      server_sha256: serverSha256,
      detected_mime_type: detected.detected,
      rejection_reason: reason,
      verified_at: new Date().toISOString(),
    }).eq("id", record.id);

    await admin.from("audit_log").insert({
      room_id: record.room_id,
      action: "file.verification_rejected",
      target_type: "room_file_version",
      target_id: record.id,
      metadata: { reason, detected_mime_type: detected.detected },
    });

    return json({ ok:false, status:"rejected", error:reason, serverSha256, detectedMimeType:detected.detected }, 422);
  }

  await admin.from("room_file_versions").update({
    verification_status: "verified",
    server_sha256: serverSha256,
    detected_mime_type: detected.detected,
    rejection_reason: null,
    verified_at: new Date().toISOString(),
  }).eq("id", record.id);

  await admin.from("audit_log").insert({
    room_id: record.room_id,
    action: "file.verified",
    target_type: "room_file_version",
    target_id: record.id,
    metadata: { server_sha256: serverSha256, detected_mime_type: detected.detected },
  });

  return json({ ok:true, status:"verified", serverSha256, detectedMimeType:detected.detected });
});
