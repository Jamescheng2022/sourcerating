import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase";
import type { RoomEvent } from "./demo-session";

export const ROOM_FILES_BUCKET = "room-files";
export const ROOM_FILE_MAX_BYTES = 50 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "image/png",
  "image/jpeg",
]);

export type RegisteredRoomFile = {
  id: string;
  room_id: string;
  logical_name: string;
  version_no: number;
  bucket_id: string;
  object_path: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  uploader_user_id: string;
  uploader_organization_id: string;
  source_event_id: string | null;
  supersedes_version_id: string | null;
  created_at: string;
};

export type RegisterFileResponse = {
  file: RegisteredRoomFile;
  event: RoomEvent;
  idempotent: boolean;
  verification?: {
    ok: boolean;
    status: "pending" | "verified" | "rejected";
    serverSha256?: string;
    detectedMimeType?: string;
    error?: string;
  };
};

function safeFileName(name: string): string {
  const normalized = name
    .normalize("NFKC")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .trim();
  const stripped = normalized
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, "_")
    .replace(/\.\.+/g, "_")
    .replace(/^\.+|\.+$/g, "");
  return stripped.slice(0, 180) || "attachment";
}

async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function uploadRoomAttachment(input: {
  roomId: string;
  actingOrganizationId: string;
  file: File;
  clientMessageId?: string;
  caption?: string;
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
}): Promise<RegisterFileResponse> {
  const { roomId, actingOrganizationId, file } = input;

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("Unsupported file type. Use PDF, Excel, PNG, or JPEG.");
  }
  if (file.size <= 0 || file.size > ROOM_FILE_MAX_BYTES) {
    throw new Error("File must be between 1 byte and 50 MB.");
  }

  const fileName = safeFileName(file.name);
  const uploadId = crypto.randomUUID();
  const objectPath = `${roomId}/${uploadId}/${fileName}`;
  const clientMessageId = input.clientMessageId ?? crypto.randomUUID();
  const shaPromise = sha256Hex(file);
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Authentication required for file upload.");

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const encodedPath = objectPath
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");

    xhr.open(
      "POST",
      `${SUPABASE_URL}/storage/v1/object/${ROOM_FILES_BUCKET}/${encodedPath}`,
    );
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("Cache-Control", "3600");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.max(
        0,
        Math.min(100, Math.round((event.loaded / event.total) * 100)),
      );
      input.onProgress?.(percent);
    };

    xhr.onerror = () => reject(new Error("File upload failed."));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        input.onProgress?.(100);
        resolve();
        return;
      }
      let message = `File upload failed (${xhr.status}).`;
      try {
        const parsed = JSON.parse(xhr.responseText);
        message = parsed?.message || parsed?.error || message;
      } catch {
        // Keep the generic message.
      }
      reject(new Error(message));
    };

    if (input.signal) {
      if (input.signal.aborted) {
        xhr.abort();
        return;
      }
      input.signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send(file);
  });

  const sha256 = await shaPromise;

  const { data, error } = await supabase.rpc("register_room_file_version", {
    p_room_id: roomId,
    p_object_path: objectPath,
    p_file_name: fileName,
    p_mime_type: file.type,
    p_size_bytes: file.size,
    p_sha256: sha256,
    p_actor_organization_id: actingOrganizationId,
    p_client_msg_id: clientMessageId,
    p_caption: input.caption?.trim() || null,
  });

  if (error) {
    throw new Error(error.message || "File registration failed.");
  }

  const result = data as RegisterFileResponse | null;
  if (!result?.file || !result?.event) {
    throw new Error("File registration returned an invalid response.");
  }

  try {
    const { data: verificationData, error: verificationError } =
      await supabase.functions.invoke("verify-room-file", {
        body: { fileVersionId: result.file.id },
      });

    if (verificationError) {
      result.verification = {
        ok: false,
        status: "pending",
        error: verificationError.message,
      };
    } else if (verificationData && typeof verificationData === "object") {
      result.verification = {
        ok: Boolean(verificationData.ok),
        status:
          verificationData.status === "verified" ||
          verificationData.status === "rejected"
            ? verificationData.status
            : "pending",
        serverSha256: verificationData.serverSha256,
        detectedMimeType: verificationData.detectedMimeType,
        error: verificationData.error,
      };
    }
  } catch (error) {
    result.verification = {
      ok: false,
      status: "pending",
      error: error instanceof Error ? error.message : "Verification pending.",
    };
  }

  return result;
}

export async function createRoomFileSignedUrl(
  objectPath: string,
  fileName?: string,
  expiresInSeconds = 120,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(ROOM_FILES_BUCKET)
    .createSignedUrl(objectPath, expiresInSeconds, {
      download: fileName || true,
    });

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Unable to open file.");
  }

  return data.signedUrl;
}

export function formatFileSize(bytes: number | undefined): string {
  if (!bytes || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}