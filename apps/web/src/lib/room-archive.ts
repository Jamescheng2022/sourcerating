/** Server-side complete room archives. Fail closed: never silently omit file bytes. */
import { createHash } from 'node:crypto';
export const ARCHIVE_FILE_BYTES = 2 * 1024 * 1024;
export const ARCHIVE_RESPONSE_BYTES = 4 * 1024 * 1024;
export const ARCHIVE_INDEX_BYTES = 512 * 1024;
export class ArchiveError extends Error {
  constructor(public code: string, message: string, public status = 409) { super(message); }
}
export interface ArchiveFile extends Record<string, unknown> {
  id: string; room_id: string; bucket_id: string; object_path: string; sha256: string; size_bytes: number;
}
export interface ArchiveAccess {
  authorizedSnapshot(roomId: string): Promise<unknown>;
  readVerified(file: ArchiveFile): Promise<Uint8Array>;
  stillAuthorized(roomId: string): Promise<boolean>;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const size = (v: unknown) => Buffer.byteLength(JSON.stringify(v));
export async function completeRoomArchive(roomId: string, access: ArchiveAccess) {
  if (!uuid.test(roomId)) throw new ArchiveError('invalid_room', 'A valid room ID is required.', 400);
  const snapshot = structuredClone(await access.authorizedSnapshot(roomId));
  if (!object(snapshot) || snapshot.schema !== 'sourcerating-room-evidence-v1' || !object(snapshot.room) || snapshot.room.id !== roomId) {
    throw new ArchiveError('invalid_snapshot', 'The room evidence snapshot could not be validated.');
  }
  if (size(snapshot) > ARCHIVE_INDEX_BYTES) throw new ArchiveError('archive_too_large', 'Evidence metadata exceeds the archive limit. No archive was generated.', 413);
  for (const key of ['events','files','proposals','canonical_objects','needs_you']) {
    if (!Array.isArray(snapshot[key]) || snapshot[key].some((row: unknown) => !object(row) || row.room_id !== roomId)) {
      throw new ArchiveError('invalid_snapshot', 'The snapshot contains invalid or cross-room records.');
    }
  }
  const files = snapshot.files as unknown[];
  if (files.length > 50) throw new ArchiveError('archive_too_large', 'This room has too many file versions for one archive.', 413);
  const seen = new Set<string>(); let declared = 0;
  const versions: ArchiveFile[] = files.map(file => {
    if (!object(file) || typeof file.id !== 'string' || !uuid.test(file.id) || seen.has(file.id) || file.bucket_id !== 'room-files' ||
        typeof file.object_path !== 'string' || !file.object_path.startsWith(roomId+'/') || file.object_path.split('/').some(s => !s || s === '.' || s === '..' || /[\x00-\x1f\\]/.test(s)) ||
        typeof file.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(file.sha256) || typeof file.size_bytes !== 'number' || !Number.isSafeInteger(file.size_bytes) || file.size_bytes <= 0) {
      throw new ArchiveError('invalid_file', 'A file version has invalid identity or integrity metadata.');
    }
    seen.add(file.id); declared += file.size_bytes;
    if (declared > ARCHIVE_FILE_BYTES) throw new ArchiveError('archive_too_large', 'File bytes exceed the 2 MiB archive limit. No partial archive was generated.', 413);
    return file as ArchiveFile;
  });
  const contents: Array<{ fileVersionId: string; sha256: string; sizeBytes: number; encoding: 'base64'; content: string }> = [];
  for (const file of versions) {
    // Production adapter must call the existing verified-file gateway using the caller JWT.
    const bytes = await access.readVerified(file);
    if (bytes.byteLength !== file.size_bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256) {
      throw new ArchiveError('file_integrity_failed', 'A file changed or failed its size/hash check. No archive was generated.');
    }
    contents.push({ fileVersionId: file.id, sha256: file.sha256, sizeBytes: bytes.byteLength, encoding: 'base64', content: Buffer.from(bytes).toString('base64') });
  }
  if (!await access.stillAuthorized(roomId)) throw new ArchiveError('room_access_denied', 'Room access ended before export completed.', 403);
  const archive = { schema: 'sourcerating-room-archive-v1', complete: true, scope: 'All file versions and evidence visible in this room snapshot; excludes other rooms and previously deleted files.', evidenceIndex: snapshot, contents };
  if (size(archive) > ARCHIVE_RESPONSE_BYTES) throw new ArchiveError('archive_too_large', 'Archive response exceeds the supported download limit.', 413);
  return archive;
}
export async function readBounded(response: Response, limit: number, signal?: AbortSignal): Promise<Uint8Array> {
  if (!response.ok || !response.body) throw new ArchiveError('file_unavailable', 'A required file or service is unavailable. No archive was generated.', 503);
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
  const cancel = () => { void reader.cancel().catch(() => undefined); };
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    if (signal?.aborted) throw new ArchiveError('archive_cancelled', 'Archive request was cancelled.', 503);
    while (true) {
      const item = await reader.read();
      if (signal?.aborted) throw new ArchiveError('archive_cancelled', 'Archive request was cancelled.', 503);
      if (item.done) break;
      length += item.value.byteLength;
      if (length > limit) throw new ArchiveError('archive_too_large', 'A response exceeded the archive byte limit.', 413);
      chunks.push(item.value);
    }
    return Buffer.concat(chunks);
  } finally { signal?.removeEventListener('abort', cancel); await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}
/** Signed URLs are consumed only in memory, from the configured backend and exact object path. */
export function checkedArchiveUrl(raw: string, backend: string, file: ArchiveFile): URL {
  const url = new URL(raw), base = new URL(backend);
  if (url.origin !== base.origin || url.username || url.password || url.hash ||
      decodeURIComponent(url.pathname) !== `/storage/v1/object/sign/room-files/${file.object_path}` ||
      !url.searchParams.get('token') || [...url.searchParams.keys()].some(k => k !== 'token')) {
    throw new ArchiveError('invalid_download', 'The file service returned an unexpected download target.');
  }
  return url;
}
