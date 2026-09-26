import { supabase } from "./supabase";
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
};

function safeFileName(name: string): string {
  const normalized = name.normalize("NFKC").trim();
  const stripped = normalized.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_");
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
  const sha256 = await sha256Hex(file);

  const { error: uploadError } = await supabase.storage
    .from(ROOM_FILES_BUCKET)
    .upload(objectPath, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "File upload failed.");
  }

  const { data, error } = await supabase.rpc("register_room_file_version", {
    p_room_id: roomId,
    p_object_path: objectPath,
    p_file_name: fileName,
    p_mime_type: file.type,
    p_size_bytes: file.size,
    p_sha256: sha256,
    p_actor_organization_id: actingOrganizationId,
    p_client_msg_id: clientMessageId,
  });

  if (error) {
    throw new Error(error.message || "File registration failed.");
  }

  const result = data as RegisterFileResponse | null;
  if (!result?.file || !result?.event) {
    throw new Error("File registration returned an invalid response.");
  }

  return result;
}

export async function createRoomFileSignedUrl(
  objectPath: string,
  expiresInSeconds = 120,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(ROOM_FILES_BUCKET)
    .createSignedUrl(objectPath, expiresInSeconds);

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