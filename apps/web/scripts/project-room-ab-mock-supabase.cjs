/**
 * A/B harness only. A loopback stand-in for the Supabase HTTP API that serves the
 * project-room-lab DEMO fixture in the row shapes the existing /project-room page reads,
 * so both front-ends can be compared on identical data without any real backend.
 * It implements just enough of auth + PostgREST for reading and posting messages.
 * No realtime, storage or edge functions. Never point a deployed build at this.
 *   node scripts/project-room-ab-mock-supabase.cjs [port=54321] [fillerEvents=0]
 */
const http = require('http');
const fixture = require('../src/app/project-room-lab/demo/fixture.json');
const port = Number(process.argv[2] || 54321);
const filler = Number(process.argv[3] || 0);
const ME = 'u-narin', ORG = 'o-sie';
const user = (id) => fixture.users.find((u) => u.id === id);
const org = (id) => fixture.orgs.find((o) => o.id === id);
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 3600;
const token = `${b64({ alg: 'none' })}.${b64({ sub: ME, role: 'authenticated', exp })}.demo`;
const authUser = { id: ME, aud: 'authenticated', role: 'authenticated', email: 'narin@demo.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-11-01T00:00:00Z' };
const session = { access_token: token, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: 'demo-refresh', user: authUser };

const visible = fixture.rooms.filter((r) => (r.kind === 'internal' ? r.ownerOrgId === ORG : r.memberIds.some((id) => user(id).orgId === ORG)));
const rooms = visible.map((r) => ({ id: r.id, name: r.name, kind: r.kind === 'internal' ? 'buyer_internal' : 'shared', project_id: `proj-${r.project}`, owner_organization_id: r.ownerOrgId, created_at: '2026-11-01T00:00:00Z' }));
const mime = { pdf: 'application/pdf', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', image: 'image/jpeg' };
const events = {};
for (const r of visible) {
  const list = [];
  const first = fixture.messages[r.id][0];
  for (let i = filler; r.id === 'r1' && i > 0; i--) list.push({ userId: r.memberIds[i % r.memberIds.length], at: new Date(new Date(first.at).getTime() - i * 47 * 60000).toISOString(), text: `历史 #${i}`, id: `old-${i}` });
  list.push(...fixture.messages[r.id]);
  events[r.id] = list.map((m, i) => {
    const u = user(m.userId), f = m.fileId && fixture.files.find((x) => x.id === m.fileId);
    return {
      id: m.id, room_id: r.id, seq: i + 1, client_msg_id: null, created_at: m.at,
      actor_user_id: u.id, actor_organization_id: u.orgId, actor_display_name: u.name, actor_organization_name: org(u.orgId).name,
      event_type: f ? 'file.attached' : 'message.posted',
      payload: f
        ? { file_version_id: f.id, object_path: `rooms/${r.id}/${f.id}`, logical_name: f.lineage, file_name: f.name, mime_type: mime[f.kind], size_bytes: f.size, version_no: f.version, supersedes_version_id: f.supersedes || null, sha256: 'demo'.padEnd(64, '0') }
        : { text: m.text || `[语音 0:${m.voice.seconds}] ${m.voice.transcript}`, who: u.name, org: org(u.orgId).name },
    };
  });
}
const pending = fixture.proposals.filter((p) => p.status === 'pending');
const tables = {
  room_members: () => visible.map((r) => ({ room_id: r.id, user_id: ME, acting_organization_id: ORG, rooms: { owner_organization_id: r.ownerOrgId } })),
  rooms: () => rooms,
  projects: (q) => rooms.filter((r) => `eq.${r.project_id}` === q.get('id')).map((r) => ({ name: r.project_id.slice(5), code: '' })),
  room_events: (q) => (events[(q.get('room_id') || '').slice(3)] || []).filter((e) => !q.get('seq') || e.seq > Number(q.get('seq').slice(3))),
  room_file_versions: () => fixture.files.map((f) => ({ id: f.id, verification_status: 'verified', server_sha256: 'demo'.padEnd(64, '0'), detected_mime_type: mime[f.kind], verification_error: null })),
  staging_proposals: (q) => pending.filter((p) => `eq.${p.roomId}` === q.get('room_id')).map((p) => ({ id: p.id, room_id: p.roomId, source_event_id: p.sources[0], proposal_type: p.kind, payload: { summary: p.title, description: p.detail }, confidence: null, provider: 'demo-fixture', status: 'pending', created_at: '2026-11-13T02:30:00Z', reviewed_at: null })),
  needs_you: (q) => pending.filter((p) => p.forOrgId === ORG && `eq.${p.roomId}` === q.get('room_id')).map((p) => ({ id: `ny-${p.id}`, room_id: p.roomId, source_event_id: p.sources[0], proposal_id: p.id, title: p.title, detail: p.detail, priority: 'normal', status: 'open', target_organization_id: ORG, created_at: '2026-11-13T02:30:00Z' })),
  canonical_objects: (q) => fixture.proposals.filter((p) => p.status === 'confirmed' && `eq.${p.roomId}` === q.get('room_id')).map((p) => ({ id: `co-${p.id}`, room_id: p.roomId, object_type: p.kind, payload: { summary: p.title, description: p.detail }, source_event_id: p.sources[0], accepted_proposal_id: p.id, version_no: 1, status: 'active', committed_at: '2026-11-11T09:20:00Z' })),
  project_inquiries: () => [],
};
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' };
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const send = (code, data) => { res.writeHead(code, { ...cors, 'content-type': 'application/json' }); res.end(JSON.stringify(data)); };
    if (req.method === 'OPTIONS') return send(200, {});
    const p = url.pathname;
    if (p === '/auth/v1/token') return send(200, session);
    if (p === '/auth/v1/user') return send(200, authUser);
    if (p === '/auth/v1/logout') return send(204, {});
    if (p === '/rest/v1/rpc/append_room_event') {
      const a = JSON.parse(body || '{}'), list = events[a.p_room_id] || (events[a.p_room_id] = []);
      const e = { id: `new-${list.length + 1}`, room_id: a.p_room_id, seq: list.length + 1, client_msg_id: a.p_client_msg_id, created_at: new Date().toISOString(), actor_user_id: ME, actor_organization_id: ORG, actor_display_name: user(ME).name, actor_organization_name: org(ORG).name, event_type: a.p_event_type, payload: a.p_payload };
      list.push(e);
      return send(200, e);
    }
    if (p.startsWith('/rest/v1/rpc/')) return send(200, null);
    if (p.startsWith('/rest/v1/')) {
      const t = tables[p.slice(9)];
      if (!t) return send(404, { message: `mock: no table ${p}` });
      const rows = t(url.searchParams);
      return (req.headers.accept || '').includes('vnd.pgrst.object') ? send(200, rows[0] ?? null) : send(200, rows);
    }
    send(404, { message: `mock: ${p} not implemented` });
  });
}).listen(port, '127.0.0.1', () => console.log(`mock supabase (DEMO fixture) on http://127.0.0.1:${port}, filler=${filler}`));
