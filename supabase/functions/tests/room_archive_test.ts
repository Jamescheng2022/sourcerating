// Isolated synthetic archive bytes. This does not establish live gateway/RLS readiness.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { ArchiveError, ARCHIVE_FILE_BYTES, completeRoomArchive, checkedArchiveUrl, readBounded, type ArchiveFile, type ArchiveAccess } from '../../../apps/web/src/lib/room-archive.ts';
const room = '52000000-0000-4000-8000-0000000000e2';
const other = '52000000-0000-4000-8000-0000000000e1';
const id = '52000000-0000-4000-8000-0000000000f1';
const bytes = new TextEncoder().encode('%PDF synthetic archive fixture');
const file: ArchiveFile = { id, room_id: room, bucket_id:'room-files', object_path: room+'/upload/report.pdf', size_bytes:bytes.length, sha256:createHash('sha256').update(bytes).digest('hex') };
function snapshot(files: ArchiveFile[] = [file]) { return { schema:'sourcerating-room-evidence-v1', room:{id:room}, events:[{id:'message-fixture',room_id:room}],files,proposals:[],canonical_objects:[],needs_you:[] }; }
function access(overrides: Partial<ArchiveAccess> = {}): ArchiveAccess { return { authorizedSnapshot: async () => snapshot(), readVerified: async () => bytes, stillAuthorized: async () => true, ...overrides }; }
async function denied(work: () => Promise<unknown>, code: string) {
  await assert.rejects(work, e => e instanceof ArchiveError && e.code === code);
}
Deno.test('complete archive contains all snapshot file bytes with round-trip integrity', async () => {
  const result=await completeRoomArchive(room,access());
  assert.equal(result.complete,true);assert.equal(result.schema,'sourcerating-room-archive-v1');
  assert.equal(result.contents.length,1);assert.equal(result.contents[0].fileVersionId,id);
  assert.deepEqual(new Uint8Array(Buffer.from(result.contents[0].content,'base64')),bytes);
  assert.equal(result.contents[0].sha256,file.sha256);
  assert(!JSON.stringify(result).includes('/object/sign/'));
});
Deno.test('empty authorized room exports zero file versions without inventing evidence', async () => {
  const result=await completeRoomArchive(room,access({authorizedSnapshot:async()=>snapshot([])}));assert.deepEqual(result.contents,[]);
});
Deno.test('cross-room metadata and duplicate file identities fail before downloading', async () => {
  let reads=0;
  await denied(()=>completeRoomArchive(room,access({authorizedSnapshot:async()=>snapshot([{...file,room_id:other}]),readVerified:async()=>{reads++;return bytes;}})),'invalid_snapshot');
  await denied(()=>completeRoomArchive(room,access({authorizedSnapshot:async()=>snapshot([file,file])})),'invalid_file');assert.equal(reads,0);
});
Deno.test('missing required snapshot collections cannot masquerade as a complete export', async () => {
  await denied(()=>completeRoomArchive(room,access({authorizedSnapshot:async()=>({...snapshot(),events:undefined})})),'invalid_snapshot');
});
Deno.test('a hash mismatch or missing byte fails the whole archive', async () => {
  await denied(()=>completeRoomArchive(room,access({readVerified:async()=>new Uint8Array(bytes.length)})),'file_integrity_failed');
  await denied(()=>completeRoomArchive(room,access({readVerified:async()=>bytes.slice(1)})),'file_integrity_failed');
});
Deno.test('gateway failure never falls back to metadata-only success', async () => {
  await denied(()=>completeRoomArchive(room,access({readVerified:async()=>{throw new ArchiveError('file_unverified','Synthetic unverified file');}})),'file_unverified');
});
Deno.test('removal during download denies final delivery even when all bytes are valid', async () => {
  await denied(()=>completeRoomArchive(room,access({stillAuthorized:async()=>false})),'room_access_denied');
});
Deno.test('file byte quotas reject oversize metadata before fetching and never truncate', async () => {
  let reads=0;
  await denied(()=>completeRoomArchive(room,access({authorizedSnapshot:async()=>snapshot([{...file,size_bytes:ARCHIVE_FILE_BYTES+1}]),readVerified:async()=>{reads++;return bytes;}})),'archive_too_large');assert.equal(reads,0);
});
Deno.test('download URLs must match configured backend and exact version object path', () => {
  const base='https://preview.example.invalid';
  const valid=base+'/storage/v1/object/sign/room-files/'+file.object_path+'?token=synthetic-fixture';
  assert.equal(checkedArchiveUrl(valid,base,file).origin,base);
  for(const candidate of [valid.replace('preview.example.invalid','elsewhere.invalid'),valid.replace('report.pdf','other.pdf'),valid+'&redirect=elsewhere',valid+'#fragment',valid.replace('https://','https://user:pass@')]) {
    assert.throws(()=>checkedArchiveUrl(candidate,base,file));
  }
});
Deno.test('bounded response reader stops and cancels oversized streams', async () => {
  let cancelled=false;
  const stream=new ReadableStream<Uint8Array>({start(c){c.enqueue(new Uint8Array(16));},cancel(){cancelled=true;}});
  await denied(()=>readBounded(new Response(stream),8),'archive_too_large');assert(cancelled);
});
Deno.test('snapshot authorization failure performs no downloads', async () => {
  let reads=0;
  await denied(()=>completeRoomArchive(room,access({authorizedSnapshot:async()=>{throw new ArchiveError('room_access_denied','Synthetic denied',403);},readVerified:async()=>{reads++;return bytes;}})),'room_access_denied');assert.equal(reads,0);
});

Deno.test('aborted archive readers cancel an idle upstream stream', async () => {
  let cancelled=false;const controller=new AbortController();
  const stream=new ReadableStream<Uint8Array>({cancel(){cancelled=true;}});
  queueMicrotask(()=>controller.abort());
  await denied(()=>readBounded(new Response(stream),8,controller.signal),'archive_cancelled');assert(cancelled);
});
