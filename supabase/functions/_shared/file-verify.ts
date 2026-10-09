// Pure server-side verification rules for room-file-gateway.
// Allowed types match the room-files bucket (migration 202609260003).

export type VerificationStatus =
  | "pending"
  | "verified"
  | "quarantined"
  | "hash_mismatch"
  | "verification_failed";

export const MIME_PDF = "application/pdf";
export const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const MIME_XLS = "application/vnd.ms-excel";
export const MIME_PNG = "image/png";
export const MIME_JPEG = "image/jpeg";
export const MIME_ZIP = "application/zip";
export const MIME_UNKNOWN = "application/octet-stream";

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIG = [0xff, 0xd8, 0xff];
const PDF_SIG = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
const ZIP_SIG = [0x50, 0x4b, 0x03, 0x04];
const CFB_SIG = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]; // legacy .xls container

function startsWith(bytes: Uint8Array, sig: number[]): boolean {
  if (bytes.length < sig.length) return false;
  return sig.every((value, index) => bytes[index] === value);
}

function containsAscii(bytes: Uint8Array, needle: string): boolean {
  const pattern = new TextEncoder().encode(needle);
  outer: for (let i = 0; i + pattern.length <= bytes.length; i++) {
    for (let j = 0; j < pattern.length; j++) {
      if (bytes[i + j] !== pattern[j]) continue outer;
    }
    return true;
  }
  return false;
}

export function detectMimeType(bytes: Uint8Array): string {
  if (startsWith(bytes, PDF_SIG)) return MIME_PDF;
  if (startsWith(bytes, PNG_SIG)) return MIME_PNG;
  if (startsWith(bytes, JPEG_SIG)) return MIME_JPEG;
  if (startsWith(bytes, CFB_SIG)) return MIME_XLS;
  if (startsWith(bytes, ZIP_SIG)) {
    // OOXML workbooks carry an xl/ part listed in the zip directory.
    return containsAscii(bytes, "[Content_Types].xml") && containsAscii(bytes, "xl/") ? MIME_XLSX : MIME_ZIP;
  }
  return MIME_UNKNOWN;
}

export type VerificationResult = {
  status: Exclude<VerificationStatus, "pending">;
  serverSha256: string;
  detectedMimeType: string;
  error: string | null;
};

export function decideVerification(input: {
  declaredMimeType: string;
  expectedSha256: string;
  expectedSizeBytes: number;
  serverSha256: string;
  sizeBytes: number;
  detectedMimeType: string;
}): VerificationResult {
  const base = { serverSha256: input.serverSha256, detectedMimeType: input.detectedMimeType };
  if (input.serverSha256 !== input.expectedSha256.toLowerCase()) {
    return { ...base, status: "hash_mismatch", error: "server_sha256_differs_from_client" };
  }
  if (input.sizeBytes !== input.expectedSizeBytes) {
    return { ...base, status: "hash_mismatch", error: "size_differs_from_registration" };
  }
  if (input.detectedMimeType !== input.declaredMimeType) {
    return { ...base, status: "quarantined", error: "content_does_not_match_declared_type" };
  }
  return { ...base, status: "verified", error: null };
}

// Object paths are "<room_id>/<upload_uuid>/<file name>" (room-files.ts, ApiClient.java).
const OBJECT_PATH_RE =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/([^/\\]+)$/i;

export function isRoomObjectPath(objectPath: unknown, roomId: string): objectPath is string {
  if (typeof objectPath !== "string" || objectPath.length > 400) return false;
  const match = OBJECT_PATH_RE.exec(objectPath);
  if (!match) return false;
  const fileName = match[2];
  // deno-lint-ignore no-control-regex -- rejecting control characters is the point
  if (fileName.includes("..") || /[\u0000-\u001f\u007f]/.test(fileName)) return false;
  return match[1].toLowerCase() === roomId.toLowerCase();
}
