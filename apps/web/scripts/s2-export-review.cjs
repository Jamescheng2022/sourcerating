// Real Auth/RLS/UI export checks on the isolated local seeded stack only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
module.exports = async ({ buyer, check, signedIn, values, passwords, output, createClient }) => {
  const shared = '52000000-0000-4000-8000-0000000000e2';
  const internal = '52000000-0000-4000-8000-0000000000e1';
  const ba = await signedIn('s2-buyer@s2-test.invalid', passwords.S2_BUYER_PASSWORD);
  const sa = await signedIn('s2-supplier@s2-test.invalid', passwords.S2_SUPPLIER_PASSWORD);
  const admin = createClient(values.API_URL, values.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  await check('Room evidence export is a server-persisted snapshot with no credential URLs', async () => {
    const { data, error } = await ba.api.rpc('export_room_evidence', { p_room_id: shared });
    assert.ifError(error); assert.equal(data.schema, 'sourcerating-room-evidence-v1');
    assert.equal(data.room.id, shared); assert(Number.isFinite(Date.parse(data.exported_at)));
    const events = await ba.api.from('room_events').select('id').eq('room_id', shared);
    assert.ifError(events.error); assert.equal(data.events.length, events.data.length);
    assert(data.events.every(e => e.room_id === shared));
    for (const field of ['files', 'proposals', 'canonical_objects', 'needs_you']) assert(Array.isArray(data[field]));
    assert(!JSON.stringify(data).includes('/object/sign/'));
  });
  await check('Supplier cannot export buyer internal room; anonymous export is denied', async () => {
    assert((await sa.api.rpc('export_room_evidence', { p_room_id: internal })).error);
    const anon = createClient(values.API_URL, values.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    assert((await anon.rpc('export_room_evidence', { p_room_id: shared })).error);
  });
  await check('Removed member cannot export with a still valid session', async () => {
    const query = () => admin.from('room_members').update({ removed_at: new Date().toISOString() }).eq('room_id', shared).eq('user_id', sa.user.id);
    const removal = await query(); assert.ifError(removal.error);
    try { assert((await sa.api.rpc('export_room_evidence', { p_room_id: shared })).error); }
    finally {
      const restored = await admin.from('room_members').update({ removed_at: null }).eq('room_id', shared).eq('user_id', sa.user.id);
      assert.ifError(restored.error);
    }
  });
  await check('Room evidence index downloads as parseable JSON through the real UI', async () => {
    const active = buyer.getByRole('button', { name: 'Export room evidence index', exact: true });
    const download = buyer.waitForEvent('download'); await active.click();
    const result = await download;
    const content = JSON.parse(fs.readFileSync(await result.path(), 'utf8'));
    assert.equal(content.schema, 'sourcerating-room-evidence-v1');
    assert(result.suggestedFilename().startsWith('room-'));
    await buyer.getByRole('status').filter({ hasText: 'File bytes are not included.' }).waitFor();
    fs.writeFileSync(require('node:path').join(output, 'export-summary.json'), JSON.stringify({ schema: content.schema, eventCount: content.events.length, fileCount: content.files.length }));
  });
  await check('Evidence export is reachable at 390px without horizontal overflow', async () => {
    await buyer.setViewportSize({ width: 390, height: 844 });
    await buyer.getByRole('button', { name: /Needs You.*Specs/ }).click();
    const download = buyer.waitForEvent('download');
    await buyer.getByRole('button', { name: 'Export room evidence index', exact: true }).click();
    assert.equal(JSON.parse(fs.readFileSync(await (await download).path(), 'utf8')).schema, 'sourcerating-room-evidence-v1');
    assert(await buyer.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  });
};
