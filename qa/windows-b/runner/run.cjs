#!/usr/bin/env node
'use strict';
// Approved entrypoint for the Test Director. Runs ONLY the entrypoints in the pinned profile.
//   run.cjs --suites baseline_real_e2e,offline_recovery [--oracle-rows rows.json | (pg mode)] [--fixed-copy work/x.cjs --for baseline_real_e2e]
//   run.cjs --finalize runs/<id> --oracle-rows rows.json        (oracle executed separately)
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process');
const guard = require('../lib/guard.cjs');
const { ROOT, profile } = guard;
const QA = path.join(ROOT, 'qa', 'windows-b');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const die = (code, msg) => { console.error('RUNNER STOP: ' + msg); process.exit(code); };

function verifyIntegrity() {
  const rootEnv = process.env.QA_INTEGRITY_ROOT_SHA256;
  if (!rootEnv) die(3, 'QA_INTEGRITY_ROOT_SHA256 is not set (owner must pin the harness) — stopping');
  const lockPath = path.join(QA, 'integrity.lock.json');
  const text = fs.readFileSync(lockPath, 'utf8');
  if (sha(text) !== rootEnv) die(3, 'integrity.lock.json does not match the owner-held root hash — judging files may have been changed');
  const lock = JSON.parse(text);
  for (const [f, h] of Object.entries(lock.files)) if (sha(fs.readFileSync(path.join(ROOT, f))) !== h) die(3, `pinned file changed: ${f}`);
  return lock;
}
const git = (a) => { try { return cp.execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return null; } };
const writeJson = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 2));
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);

function parseLines(text, suite) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^(PASS|FAIL|NOT RUN) (.+?)(?: — (.*))?$/.exec(line);
    if (m) out.push({ suite, name: m[2], status: m[1] === 'PASS' ? 'pass' : m[1] === 'FAIL' ? 'fail' : 'notrun', error: m[3] || null });
  }
  return out;
}

function finalize(runDir, oracleResult, meta) {
  const crit = JSON.parse(fs.readFileSync(path.join(QA, 'acceptance', 'criteria.json'), 'utf8'));
  const results = JSON.parse(fs.readFileSync(path.join(runDir, 'results.json'), 'utf8')).results;
  const byName = new Map(); for (const r of results) byName.set(r.name, r);
  const oracle = oracleResult ? new Map(oracleResult.checks.map((c) => [c.id, c])) : null;
  const reqs = crit.requirements.map((rq) => {
    const checks = rq.checks.map((n) => { const r = byName.get(n); return { name: n, status: r ? r.status : 'missing', error: r ? r.error : null }; });
    const oc = (rq.oracle || []).map((id) => { const c = oracle && oracle.get(id); return { id, status: !c ? 'missing' : c.ok === true ? 'pass' : c.ok === false ? 'fail' : 'skipped', actual: c ? c.actual : null }; });
    const bad = checks.some((c) => c.status !== 'pass') || oc.some((c) => c.status !== 'pass');
    return { id: rq.id, title: rq.title, status: bad ? 'fail' : 'pass', checks, oracle: oc };
  });
  const allChecks = [...new Set(crit.requirements.flatMap((r) => r.checks))];
  const allOracle = [...new Set(crit.requirements.flatMap((r) => r.oracle || []))];
  const cs = (n) => (byName.get(n) || { status: 'missing' }).status;
  const os = (id) => { const c = oracle && oracle.get(id); return !c ? 'missing' : c.ok === true ? 'pass' : c.ok === false ? 'fail' : 'skipped'; };
  const cov = {
    uiChecksRequired: allChecks.length, uiChecksPassed: allChecks.filter((n) => cs(n) === 'pass').length, uiChecksFailed: allChecks.filter((n) => cs(n) === 'fail').length, uiChecksMissing: allChecks.filter((n) => cs(n) === 'missing').length,
    oracleChecksRequired: allOracle.length, oracleChecksPassed: allOracle.filter((i) => os(i) === 'pass').length,
    requirementsTotal: reqs.length, requirementsPassed: reqs.filter((r) => r.status === 'pass').length,
  };
  cov.coveragePct = Math.round(100 * (cov.uiChecksPassed + cov.oracleChecksPassed) / (cov.uiChecksRequired + cov.oracleChecksRequired + crit.allowedNotRun.length));
  cov.executedPct = Math.round(100 * (cov.uiChecksPassed + cov.oracleChecksPassed) / (cov.uiChecksRequired + cov.oracleChecksRequired));
  const blocked = fs.existsSync(path.join(runDir, 'logs', 'blocked-requests.jsonl')) ? fs.readFileSync(path.join(runDir, 'logs', 'blocked-requests.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
  const boundary = blocked.filter((b) => b.boundary).length;
  const unexpectedFails = results.filter((r) => r.status === 'fail' && !allChecks.includes(r.name));
  const notRun = results.filter((r) => r.status === 'notrun');
  const unlistedNotRun = notRun.filter((r) => !crit.allowedNotRun.includes(r.name));
  let verdict = 'PASS', why = [];
  if (!oracleResult) { verdict = 'INCOMPLETE'; why.push('oracle did not run'); }
  if (reqs.some((r) => r.status !== 'pass')) { verdict = 'FAIL'; why.push('requirement(s) failed: ' + reqs.filter((r) => r.status !== 'pass').map((r) => r.id).join(',')); }
  if (unexpectedFails.length) { verdict = 'FAIL'; why.push('unlisted check(s) failed: ' + unexpectedFails.map((r) => r.name).join('; ')); }
  if (unlistedNotRun.length) { verdict = 'FAIL'; why.push('unlisted NOT RUN: ' + unlistedNotRun.map((r) => r.name).join('; ')); }
  if (boundary > crit.limits.maxBoundaryViolations) { verdict = 'FAIL'; why.push(`${boundary} request(s) to a forbidden host were attempted and blocked`); }
  if (blocked.length - boundary > crit.limits.maxBlockedUnexpectedRequests) { verdict = verdict === 'PASS' ? 'FAIL' : verdict; why.push(`${blocked.length - boundary} request(s) to non-allow-listed hosts were blocked`); }
  const out = { verdict, why, coverage: cov, requirements: reqs, notRun: notRun.map((r) => r.name), blockedRequests: blocked.length, boundaryViolations: boundary, meta };
  writeJson(path.join(runDir, 'verdict.json'), out);

  // failure reproduction notes
  const fails = results.filter((r) => r.status === 'fail');
  fs.mkdirSync(path.join(runDir, 'repro'), { recursive: true });
  fails.forEach((f, i) => {
    const shots = fs.existsSync(path.join(runDir, 'screenshots')) ? fs.readdirSync(path.join(runDir, 'screenshots')).filter((s) => s.startsWith(f.suite + '-fail')) : [];
    fs.writeFileSync(path.join(runDir, 'repro', `${String(i + 1).padStart(2, '0')}.md`), [
      `# Failure ${i + 1}: ${f.name}`, '', `- Suite: ${f.suite}`, `- Error: ${f.error}`, `- Target: ${meta.target}`, `- Commit: ${meta.commit}${meta.fixedCopy ? ' (fixed copy, see fix.diff)' : ''}`, '',
      '## Reproduce', '```', `QA_INTEGRITY_ROOT_SHA256=<owner value> node qa/windows-b/runner/run.cjs --suites ${f.suite}${f.suite === 'offline_recovery' ? ' (needs the baseline suite in the same run for its stamp)' : ''}`, '```',
      '', '## Evidence', `- trace(s): traces/${f.suite}-ctx*.zip  (open with: npx playwright show-trace <file>)`, `- screenshots: ${shots.length ? shots.map((s) => 'screenshots/' + s).join(', ') : 'none captured'}`, `- log: logs/${f.suite}.log`, `- console: logs/console.jsonl`, ''].join('\n'));
  });
  for (const c of (oracleResult ? oracleResult.checks.filter((c) => c.ok === false) : [])) fs.appendFileSync(path.join(runDir, 'repro', 'oracle.md'), `- ORACLE ${c.id}: expected ${JSON.stringify(c.expected)} got ${c.actual}\n  re-run: node qa/windows-b/oracle/oracle.cjs --stamp ${meta.stamp} --print-sql  (read-only console)\n`);

  const L = [`# SourceRating Windows B E2E — ${verdict}`, '', `Run ${path.basename(runDir)} · target ${meta.target} · commit ${meta.commit}${meta.fixedCopy ? ' · FIXED COPY (see fix.diff)' : ''}`, '', why.length ? 'Reasons: ' + why.join(' | ') : 'All required checks and oracle checks passed.', '',
    `Coverage: ${cov.coveragePct}% of required UI+oracle checks plus the ${crit.allowedNotRun.length} declared gaps (${cov.executedPct}% of the executable ones). UI ${cov.uiChecksPassed}/${cov.uiChecksRequired}, oracle ${cov.oracleChecksPassed}/${cov.oracleChecksRequired}, requirements ${cov.requirementsPassed}/${cov.requirementsTotal}.`, '', '| Req | Title | Result |', '|---|---|---|', ...reqs.map((r) => `| ${r.id} | ${r.title} | ${r.status.toUpperCase()} |`), '',
    '## Not run (declared gaps)', ...(notRun.length ? notRun.map((r) => `- ${r.name}: ${r.error || ''}`) : ['- none']), '', `Blocked requests: ${blocked.length} (forbidden hosts: ${boundary})`, ''];
  fs.writeFileSync(path.join(runDir, 'report.md'), L.join('\n'));
  const manifest = walk(runDir).filter((f) => !f.endsWith('manifest.json')).map((f) => ({ file: path.relative(runDir, f), sha256: sha(fs.readFileSync(f)), bytes: fs.statSync(f).size }));
  writeJson(path.join(runDir, 'manifest.json'), manifest);
  console.log(`VERDICT ${verdict} coverage=${cov.coveragePct}% ui=${cov.uiChecksPassed}/${cov.uiChecksRequired} oracle=${cov.oracleChecksPassed}/${cov.oracleChecksRequired} failures=${fails.length}`);
  return out;
}

async function main() {
  const lock = verifyIntegrity();
  if (arg('finalize')) {
    const runDir = path.resolve(arg('finalize'));
    if (!runDir.startsWith(path.join(QA, 'runs'))) die(3, 'finalize path must be under qa/windows-b/runs');
    const meta = JSON.parse(fs.readFileSync(path.join(runDir, 'meta.json'), 'utf8'));
    const o = path.join(runDir, 'oracle-result.json');
    const r = cp.spawnSync('node', [path.join(QA, 'oracle', 'oracle.cjs'), '--stamp', meta.stamp, '--suites', meta.suites.join(','), '--mode', 'snapshot', '--rows', path.resolve(arg('oracle-rows')), '--out', o], { encoding: 'utf8' });
    fs.writeFileSync(path.join(runDir, 'logs', 'oracle.log'), r.stdout + r.stderr);
    const res = finalize(runDir, fs.existsSync(o) ? JSON.parse(fs.readFileSync(o, 'utf8')) : null, meta);
    process.exit(res.verdict === 'PASS' ? 0 : 1);
  }
  const suites = String(arg('suites', Object.keys(profile.entrypoints).join(','))).split(',');
  for (const s of suites) if (!profile.entrypoints[s]) die(3, `suite ${s} is not an approved entrypoint`);
  try { guard.assertEnv(process.env); } catch (e) { die(3, e.message); }
  // Pre-flight: a broken target must be reported as BLOCKED, not as dozens of product failures.
  for (const [label, url, init, ok] of [['app page', new URL('/project-room-b', process.env.B_URL).href, {}, (s) => s === 200], ['assist route answers (401 without token)', new URL('/api/project-room-b/assist', process.env.B_URL).href, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }, (s) => s === 401], ['gateway route answers (401 without token)', new URL('/api/project-room-b/gateway', process.env.B_URL).href, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }, (s) => s === 401]]) {
    let st = null; try { st = (await fetch(url, init)).status; } catch (e) { st = 'unreachable: ' + e.message; }
    if (!ok(st)) die(4, `BLOCKED by environment, not a test result: preflight "${label}" returned ${st}`);
  }
  const id = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
  const runDir = path.join(QA, 'runs', id); for (const d of ['logs', 'traces', 'screenshots', 'artifacts', 'db']) fs.mkdirSync(path.join(runDir, d), { recursive: true });
  const meta = { runId: id, target: process.env.B_URL, supabase: process.env.B_SUPABASE_URL || null, branch: git(['branch', '--show-current']), commit: git(['rev-parse', 'HEAD']), baselineTag: git(['rev-parse', 'qa-baseline-20261114']), startedAt: new Date().toISOString(), suites, node: process.version, integrityRoot: sha(fs.readFileSync(path.join(QA, 'integrity.lock.json'), 'utf8')), fixedCopy: null };
  const entry = Object.fromEntries(suites.map((s) => [s, path.join(ROOT, profile.entrypoints[s].file)]));
  if (arg('fixed-copy')) {
    const fc = path.resolve(arg('fixed-copy')), forS = arg('for');
    if (!fc.startsWith(path.join(QA, 'work') + path.sep) || !entry[forS]) die(3, 'fixed copy must live in qa/windows-b/work and replace an approved suite');
    const d = cp.spawnSync('git', ['diff', '--no-index', '--', path.join(ROOT, profile.entrypoints[forS].file), fc], { encoding: 'utf8' });
    fs.writeFileSync(path.join(runDir, 'fix.diff'), d.stdout); meta.fixedCopy = { for: forS, file: path.relative(ROOT, fc), sha256: sha(fs.readFileSync(fc)) }; entry[forS] = fc;
  }
  const results = []; let stamp = null; let timedOut = false;
  for (const s of suites) {
    const env = { ...guard.childEnv(process.env), NODE_PATH: path.join(ROOT, 'apps', 'web', 'node_modules'), QA_RUN_DIR: runDir, QA_PRELOAD_PROFILE: s, B_QA_OUTPUT: path.join(runDir, 'artifacts') };
    if (stamp) env.B_BASELINE_STAMP = stamp;
    console.log(`RUN ${s}`);
    const r = cp.spawnSync(process.execPath, ['-r', path.join(QA, 'lib', 'preload.cjs'), entry[s]], { cwd: path.join(ROOT, 'apps', 'web'), env, encoding: 'utf8', timeout: profile.maxRunSeconds ? profile.maxRunSeconds * 1000 : 1800000, maxBuffer: 64 * 1024 * 1024 });
    if (r.error && r.error.code === 'ETIMEDOUT') timedOut = true;
    fs.writeFileSync(path.join(runDir, 'logs', `${s}.log`), (r.stdout || '') + '\n--- stderr ---\n' + (r.stderr || ''));
    const parsed = parseLines(r.stdout || '', s);
    if (r.status !== 0 && !parsed.some((p) => p.status === 'fail')) parsed.push({ suite: s, name: `${s}: process exited ${r.status ?? r.signal}`, status: 'fail', error: ((r.stderr || '').trim().split('\n').pop() || '').slice(0, 300) });
    results.push(...parsed);
    const js = path.join(runDir, 'artifacts', 'real-acceptance.json');
    if (s === 'baseline_real_e2e' && fs.existsSync(js)) stamp = JSON.parse(fs.readFileSync(js, 'utf8')).stamp;
    console.log(`  ${parsed.filter((p) => p.status === 'pass').length} pass, ${parsed.filter((p) => p.status === 'fail').length} fail`);
  }
  meta.stamp = stamp; meta.timedOut = timedOut; meta.finishedAt = new Date().toISOString();
  writeJson(path.join(runDir, 'results.json'), { results }); writeJson(path.join(runDir, 'meta.json'), meta);
  if (!stamp) { console.log('RUNNER: no stamp from the baseline suite, oracle cannot be scoped'); const res = finalize(runDir, null, meta); process.exit(res.verdict === 'PASS' ? 0 : 1); }
  fs.writeFileSync(path.join(runDir, 'db', 'oracle.sql'), cp.execFileSync('node', [path.join(QA, 'oracle', 'oracle.cjs'), '--stamp', stamp, '--print-sql'], { encoding: 'utf8' }));
  if (process.env.ORACLE_DATABASE_URL && !arg('oracle-rows')) {
    const o = path.join(runDir, 'oracle-result.json');
    const r = cp.spawnSync('node', [path.join(QA, 'oracle', 'oracle.cjs'), '--stamp', stamp, '--suites', suites.join(','), '--out', o], { encoding: 'utf8', env: { ...process.env } });
    fs.writeFileSync(path.join(runDir, 'logs', 'oracle.log'), r.stdout + r.stderr);
    const res = finalize(runDir, fs.existsSync(o) ? JSON.parse(fs.readFileSync(o, 'utf8')) : null, meta); process.exit(res.verdict === 'PASS' ? 0 : 1);
  }
  console.log(`PHASE2 oracle pending: run  node qa/windows-b/runner/run.cjs --finalize ${path.relative(ROOT, runDir)} --oracle-rows <rows.json>   (SQL in ${path.relative(ROOT, path.join(runDir, 'db', 'oracle.sql'))}, stamp ${stamp})`);
}
main().catch((e) => { console.error(e); process.exit(2); });
