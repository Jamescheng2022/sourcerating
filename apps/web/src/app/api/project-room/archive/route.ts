import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase-config';
import { ArchiveError, ARCHIVE_INDEX_BYTES, ARCHIVE_FILE_BYTES, completeRoomArchive, checkedArchiveUrl, readBounded } from '@/lib/room-archive';
export const runtime = 'nodejs';
export const maxDuration = 30;
export async function POST(request: Request) {
  const privateHeaders = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: privateHeaders });
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(25000)]);
  try {
    const bytes = await readBounded(new Response(request.body), 4096, signal);
    let body: unknown;
    try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new ArchiveError('invalid_request','Expected a JSON roomId request.',400); }
    if (!body || typeof body !== 'object' || !('roomId' in body) || typeof body.roomId !== 'string') throw new ArchiveError('invalid_room','A valid room ID is required.',400);
    const roomId = body.roomId;
    // Same caller-scoped client as the existing analysis route. Never use a service key.
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` },
      fetch: async (url, init) => {
        const response = await fetch(url, { ...init, signal, redirect: 'error' });
        if (!response.ok) return response;
        const data = await readBounded(response, ARCHIVE_INDEX_BYTES);
        return new Response(data as BodyInit, { status: response.status, headers: response.headers });
      } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: identity, error: authError } = await client.auth.getUser(token);
    if (authError || !identity.user) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: privateHeaders });
    const archive = await completeRoomArchive(roomId, {
      async authorizedSnapshot(id) {
        const { data, error } = await client.rpc('export_room_evidence', { p_room_id: id });
        if (error) throw new ArchiveError('room_access_denied','The room snapshot is unavailable or access is denied.',403);
        return data;
      },
      async readVerified(file) {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/room-file-gateway`, { method: 'POST', signal, redirect: 'error',
          headers: { authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY, 'content-type':'application/json' },
          body: JSON.stringify({ action:'sign', fileVersionId:file.id }) });
        const result = JSON.parse(new TextDecoder().decode(await readBounded(response, 16384)));
        if (!result.ok || result.verificationStatus !== 'verified' || typeof result.signedUrl !== 'string') {
          throw new ArchiveError('file_unverified','Every file must pass existing byte verification before a complete archive can be generated.');
        }
        const url = checkedArchiveUrl(result.signedUrl, SUPABASE_URL, file);
        return readBounded(await fetch(url, { signal, redirect:'error' }), Math.min(file.size_bytes, ARCHIVE_FILE_BYTES));
      },
      async stillAuthorized(id) { const r = await client.from('rooms').select('id').eq('id',id).maybeSingle(); return !r.error && !!r.data; },
    });
    return Response.json(archive, { headers: { ...privateHeaders, 'Content-Disposition': `attachment; filename="room-${roomId}-archive.json"` } });
  } catch (error) {
    const known = error instanceof ArchiveError;
    return Response.json({ error: known ? error.message : 'Archive could not be completed. No partial archive was generated.', code: known ? error.code : 'archive_unavailable' },
      { status: known ? error.status : 503, headers: privateHeaders });
  }
}
