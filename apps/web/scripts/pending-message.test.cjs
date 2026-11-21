const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/lib/pending-message.ts'), 'utf8');
const mod = { exports: {} };
new Function('exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(mod.exports);
const { savePendingMessage, readPendingMessage, removePendingMessage, clearPendingMessages } = mod.exports;
function store() {
  const data = new Map();
  return { get length() { return data.size; }, key: i => [...data.keys()][i] ?? null,
    getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
}
const draft = { room_id: 'room-a', client_msg_id: '52000000-0000-4000-8000-000000000001', text: 'Synthetic pending message', created_at: '2026-10-24T00:00:00.000Z', status: 'sending' };
test('Reload retains immutable request identity and text, never silently replays', () => {
  const s = store(); savePendingMessage(s, 'alice', draft);
  const restored = readPendingMessage(s, 'alice', 'room-a');
  assert.equal(restored.client_msg_id, draft.client_msg_id); assert.equal(restored.text, draft.text); assert.equal(restored.status, 'failed');
  savePendingMessage(s, 'alice', restored); assert.equal(s.length, 1);
  assert.throws(() => savePendingMessage(s, 'alice', { ...draft, text: 'Different payload' }));
  assert.equal(readPendingMessage(s, 'alice', 'room-a').text, draft.text);
});
test('Other accounts/rooms cannot restore or clear this pending request', () => {
  const s = store(); savePendingMessage(s, 'alice', draft);
  assert.equal(readPendingMessage(s, 'bob', 'room-a'), null); assert.equal(readPendingMessage(s, 'alice', 'room-b'), null);
  clearPendingMessages(s, 'bob'); assert.equal(s.length, 1);
  s.setItem('unrelated-setting', 'preserve'); clearPendingMessages(s, 'alice'); assert.equal(s.length, 1); assert.equal(s.getItem('unrelated-setting'), 'preserve');
});
test('Acknowledging one tab request retains the other pending request', () => {
  const s = store(), other = { ...draft, client_msg_id: '52000000-0000-4000-8000-000000000002' };
  savePendingMessage(s, 'alice', draft); savePendingMessage(s, 'alice', other);
  removePendingMessage(s, 'alice', draft); assert.equal(readPendingMessage(s, 'alice', 'room-a').client_msg_id, other.client_msg_id);
});
test('Unavailable or corrupt storage fails closed without losing the original', () => {
  const s = store(); savePendingMessage(s, 'alice', draft);
  s.setItem(s.key(0), '{corrupt'); assert.throws(() => readPendingMessage(s, 'alice', 'room-a')); assert.equal(s.length, 1);
  const full = store(); full.setItem = () => { throw new Error('Quota exceeded'); };
  assert.throws(() => savePendingMessage(full, 'alice', draft), /Quota exceeded/);
});
