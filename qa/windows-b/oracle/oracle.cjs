#!/usr/bin/env node
'use strict';
// Independent oracle. Usage:
//   oracle.cjs --stamp 11140216 --suites baseline_real_e2e,offline_recovery --out result.json [--mode pg]
//   oracle.cjs --stamp ... --mode snapshot --rows rows.json --out result.json     (rows = [{check_id, actual}])
//   oracle.cjs --stamp ... --print-sql                                           (SQL for a read-only console)
// pg mode needs ORACLE_DATABASE_URL (a read-only role, never the app's role) and the `pg` package.
const fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const stamp = String(arg('stamp', ''));
if (!/^\d{8,10}$/.test(stamp)) { console.error('oracle: --stamp must be 8-10 digits'); process.exit(2); }
const sql = fs.readFileSync(path.join(__dirname, 'queries', 'oracle.sql'), 'utf8').replace(/\{\{STAMP\}\}/g, stamp);
if (arg('print-sql')) { process.stdout.write(sql); process.exit(0); }
const expect = JSON.parse(fs.readFileSync(path.join(__dirname, 'expectations.json'), 'utf8'));
const suites = String(arg('suites', '')).split(',').filter(Boolean);
const mode = arg('mode', 'pg');

async function rows() {
  if (mode === 'snapshot') return JSON.parse(fs.readFileSync(arg('rows'), 'utf8'));
  if (!process.env.ORACLE_DATABASE_URL) { console.error('oracle: ORACLE_DATABASE_URL is not set'); process.exit(3); }
  const host = new URL(process.env.ORACLE_DATABASE_URL).hostname;
  const m = /^db\.([a-z0-9]{20})\.supabase\.co$/.exec(host) || /\.([a-z0-9]{20})$/.exec(new URL(process.env.ORACLE_DATABASE_URL).username || '');
  const guard = require('../lib/guard.cjs');
  const ref = m && m[1];
  if (!ref || !guard.profile.targets.supabaseAllowedRefs.includes(ref)) { console.error(`oracle: database ${host} is not an allow-listed synthetic tenant — stopping`); process.exit(3); }
  const { Client } = require('pg');
  const c = new Client({ connectionString: process.env.ORACLE_DATABASE_URL, ssl: { rejectUnauthorized: true } });
  await c.connect();
  try { await c.query('begin'); const r = await c.query(sql); await c.query('rollback'); const last = Array.isArray(r) ? r[r.length - 1] : r; return last.rows; }
  finally { await c.end(); }
}
const ok = (e, a) => (a === undefined || a === null) ? false : e.op === 'eq' ? Number(a) === e.value : e.op === 'gte' ? Number(a) >= e.value : false;

rows().then((r) => {
  const got = Object.fromEntries(r.map((x) => [x.check_id, x.actual]));
  const checks = Object.entries(expect).filter(([k]) => !k.startsWith('_')).map(([id, e]) => {
    if (e.requiresSuite && !suites.includes(e.requiresSuite)) return { id, expected: e, actual: got[id] ?? null, ok: null, note: `suite ${e.requiresSuite} not run` };
    return { id, expected: e, actual: got[id] ?? null, ok: ok(e, got[id]) };
  });
  const unknown = Object.keys(got).filter((k) => !(k in expect));
  const failed = checks.filter((c) => c.ok === false);
  const res = { stamp, mode, at: new Date().toISOString(), pass: failed.length === 0 && unknown.length === 0, executed: checks.filter((c) => c.ok !== null).length, passed: checks.filter((c) => c.ok === true).length, failed: failed.length, skipped: checks.filter((c) => c.ok === null).length, unexpectedChecks: unknown, checks };
  if (arg('out')) fs.writeFileSync(arg('out'), JSON.stringify(res, null, 2));
  for (const c of checks) console.log(c.ok === true ? 'ORACLE PASS' : c.ok === false ? 'ORACLE FAIL' : 'ORACLE SKIP', c.id, 'actual=' + c.actual);
  console.log(`ORACLE ${res.pass ? 'PASS' : 'FAIL'} ${res.passed}/${res.executed}`);
  process.exit(res.pass ? 0 : 1);
}).catch((e) => { console.error('oracle error:', e.message); process.exit(2); });
