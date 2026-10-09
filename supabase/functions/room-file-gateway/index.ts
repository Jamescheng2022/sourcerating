// room-file-gateway — rebuilt 2026-10-10 from the client contract
// (apps/web/src/lib/room-files.ts, project-room/page.tsx) and migrations
// 202609260003..0006 plus 202610100001. The deployed original was not used.
//
// Requires a signed-in user (verify_jwt = true). Every action first proves room
// access with the caller's own JWT; the service role is used only afterwards for
// storage reads/deletes and for writing the verification verdict.
//
// POST { action: "verify", fileVersionId }
//   -> { ok, verificationStatus, serverSha256, detectedMimeType, error? }
// POST { action: "sign", fileVersionId }
//   -> { ok, signedUrl, expiresIn, verificationStatus }  (verified files only)
// POST { action: "cleanup_orphan", objectPath, roomId }
//   -> { ok, removed }  (caller's own upload that was never registered)

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { corsHeaders, isUuid, json, readJsonObject, requireEnv, sha256Hex } from "../_shared/http.ts";
import { decideVerification, detectMimeType, isRoomObjectPath } from "../_shared/file-verify.ts";

const SIGNED_URL_TTL_SECONDS = 300;

type FileVersionRow = {
  id: string;
  room_id: string;
  logical_name: string;
  bucket_id: string;
  object_path: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  client_sha256: string | null;
  server_sha256: string | null;
  detected_mime_type: string | null;
  verification_status: string;
  verification_error: string | null;
};

function verdict(row: FileVersionRow) {
  return {
    ok: row.verification_status === "verified",
    verificationStatus: row.verification_status,
    serverSha256: row.server_sha256 ?? undefined,
    detectedMimeType: row.detected_mime_type ?? undefined,
    error: row.verification_error ?? undefined,
  };
}

// Inside the local stack SUPABASE_URL is the internal gateway (http://kong:8000);
// browsers need the public URL, so signed URLs are re-based when it is configured.
function publicSignedUrl(signedUrl: string): string {
  const publicBase = Deno.env.get("SR_PUBLIC_SUPABASE_URL");
  if (!publicBase) return signedUrl;
  const internal = new URL(signedUrl);
  const target = new URL(publicBase);
  internal.protocol = target.protocol;
  internal.host = target.host;
  return internal.toString();
}

async function loadAccessibleFile(
  userClient: SupabaseClient,
  fileVersionId: string,
): Promise<FileVersionRow | null> {
  const { data, error } = await userClient.rpc("get_room_file_version_for_access", {
    p_file_version_id: fileVersionId,
  });
  if (error) throw new Error(`access_check_failed:${error.message}`);
  const row = (Array.isArray(data) ? data[0] : data) as FileVersionRow | null;
  // A composite return with no match comes back as an all-null row.
  return row && row.id ? row : null;
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405, cors);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ ok: false, error: "authentication_required" }, 401, cors);
  }

  const body = await readJsonObject(req);
  if (!body) return json({ ok: false, error: "invalid_request" }, 400, cors);

  let userClient: SupabaseClient;
  let admin: SupabaseClient;
  try {
    const url = requireEnv("SUPABASE_URL");
    userClient = createClient(url, requireEnv("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    admin = createClient(url, requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: "server_config_missing" }, 500, cors);
  }

  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userError || !user) return json({ ok: false, error: "authentication_required" }, 401, cors);

  try {
    switch (body.action) {
      case "verify": {
        if (!isUuid(body.fileVersionId)) return json({ ok: false, error: "invalid_file_version_id" }, 400, cors);
        const row = await loadAccessibleFile(userClient, body.fileVersionId);
        if (!row) return json({ ok: false, error: "file_not_found" }, 404, cors);
        if (row.verification_status !== "pending") return json(verdict(row), 200, cors);

        const download = await admin.storage.from(row.bucket_id).download(row.object_path);
        let result;
        if (download.error || !download.data) {
          result = {
            status: "verification_failed" as const,
            serverSha256: null,
            detectedMimeType: null,
            error: "object_download_failed",
          };
        } else {
          const bytes = new Uint8Array(await download.data.arrayBuffer());
          const serverSha256 = await sha256Hex(bytes);
          result = decideVerification({
            declaredMimeType: row.mime_type,
            expectedSha256: row.client_sha256 ?? row.sha256,
            expectedSizeBytes: Number(row.size_bytes),
            serverSha256,
            sizeBytes: bytes.length,
            detectedMimeType: detectMimeType(bytes),
          });
        }

        // Only a still-pending row is updated, so concurrent verifies cannot flip a verdict.
        const { data: updated, error: updateError } = await admin
          .from("room_file_versions")
          .update({
            verification_status: result.status,
            server_sha256: result.serverSha256,
            detected_mime_type: result.detectedMimeType,
            verification_error: result.error,
            verified_at: new Date().toISOString(),
          })
          .eq("id", row.id)
          .eq("verification_status", "pending")
          .select(
            "id, room_id, logical_name, bucket_id, object_path, mime_type, size_bytes, sha256, client_sha256, server_sha256, detected_mime_type, verification_status, verification_error",
          )
          .maybeSingle<FileVersionRow>();
        if (updateError) throw new Error(`verdict_write_failed:${updateError.message}`);
        if (updated) return json(verdict(updated), 200, cors);

        const current = await loadAccessibleFile(userClient, row.id);
        return json(current ? verdict(current) : { ok: false, error: "file_not_found" }, current ? 200 : 404, cors);
      }

      case "sign": {
        if (!isUuid(body.fileVersionId)) return json({ ok: false, error: "invalid_file_version_id" }, 400, cors);
        const row = await loadAccessibleFile(userClient, body.fileVersionId);
        if (!row) return json({ ok: false, error: "file_not_found" }, 404, cors);
        if (row.verification_status !== "verified") {
          return json(
            {
              ok: false,
              verificationStatus: row.verification_status,
              error: `Unable to open file: ${row.verification_status}`,
            },
            409,
            cors,
          );
        }
        const { data: signed, error: signError } = await admin.storage
          .from(row.bucket_id)
          .createSignedUrl(row.object_path, SIGNED_URL_TTL_SECONDS);
        if (signError || !signed?.signedUrl) throw new Error(`sign_failed:${signError?.message ?? "no url"}`);
        return json(
          {
            ok: true,
            signedUrl: publicSignedUrl(signed.signedUrl),
            expiresIn: SIGNED_URL_TTL_SECONDS,
            verificationStatus: row.verification_status,
          },
          200,
          cors,
        );
      }

      case "cleanup_orphan": {
        if (!isUuid(body.roomId) || !isRoomObjectPath(body.objectPath, body.roomId)) {
          return json({ ok: false, error: "invalid_object_path" }, 400, cors);
        }
        const { data: member, error: memberError } = await userClient.rpc("is_room_member", {
          p_room_id: body.roomId,
        });
        if (memberError) throw new Error(`access_check_failed:${memberError.message}`);
        if (member !== true) return json({ ok: false, error: "room_access_denied" }, 403, cors);

        const { data: objects, error: objectError } = await admin.rpc("room_file_orphan_object", {
          p_object_path: body.objectPath,
        });
        if (objectError) throw new Error(`orphan_lookup_failed:${objectError.message}`);
        const object = (Array.isArray(objects) ? objects[0] : objects) as
          | { owner_id: string | null; registered: boolean }
          | null;
        if (!object) return json({ ok: true, removed: false }, 200, cors);
        if (object.registered) return json({ ok: false, error: "object_is_registered" }, 409, cors);
        if (object.owner_id !== user.id) return json({ ok: false, error: "object_not_owned" }, 403, cors);

        const { error: removeError } = await admin.storage.from("room-files").remove([body.objectPath]);
        if (removeError) throw new Error(`remove_failed:${removeError.message}`);
        return json({ ok: true, removed: true }, 200, cors);
      }

      default:
        return json({ ok: false, error: "invalid_action" }, 400, cors);
    }
  } catch (error) {
    console.error("room-file-gateway", body.action, error instanceof Error ? error.message : error);
    return json({ ok: false, error: "gateway_error" }, 500, cors);
  }
});
