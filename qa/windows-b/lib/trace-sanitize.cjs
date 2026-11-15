'use strict';
// Rewrites a Playwright trace zip so that credentials never reach evidence, then re-scans it. Fail-closed:
// any error or any surviving credential deletes the trace (and its temp file) and returns ok:false (caller must STOP).
// Text entries only; images are kept byte-for-byte (they cannot be redacted, so tracing starts after login and
// password inputs are masked by the browser). Known limit: credentials rendered as page pixels are not detectable.
const fs = require('fs'), path = require('path');
const { yauzl, yazl } = require(require.resolve('playwright-core/lib/zipBundle', { paths: [path.join(__dirname, '..', '..', '..', 'apps', 'web')] }));

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Every secret is matched in its UTF-8 bytes read as latin1 (how entries are processed) plus its JSON-escaped form.
const forms = (secrets) => secrets.filter(Boolean).flatMap((s) => [s, JSON.stringify(s).slice(1, -1)]).flatMap((s) => [s, Buffer.from(s, 'utf8').toString('latin1')]);
const Q = '\\\\*"'; // a double quote under any level of JSON escaping
const HEADER = '(?:authorization|apikey|cookie|set-cookie|x-supabase-auth|proxy-authorization|x-api-key)';
const TOKEN_KEY = '(?:access_token|refresh_token|provider_token|provider_refresh_token|password|token_hash|token|id_token|code_verifier)';
// JSON string values of sensitive keys, at any escaping depth. Each prefix ends at the value's opening quote; if that
// quote is preceded by n backslashes, the value ends at the first quote preceded by EXACTLY n backslashes (a quote
// inside the value carries 2n+1, see below). Redaction and scanning share this parser, so they cannot disagree.
const VALUE_PREFIXES = [
  Q + 'name' + Q + '\\s*:\\s*' + Q + HEADER + Q + '\\s*,\\s*' + Q + 'value' + Q + '\\s*:\\s*' + Q,
  Q + HEADER + Q + '\\s*:\\s*' + Q,
  TOKEN_KEY + Q + '\\s*:\\s*' + Q,
];
const jsonValues = (text) => {
  const out = [];
  for (const src of VALUE_PREFIXES) {
    const re = new RegExp(src, 'gi'); let m;
    while ((m = re.exec(text))) {
      const start = m.index + m[0].length; let n = 0; while (text[start - 2 - n] === '\\') n++;
      let end = -1;
      // at this level a literal content backslash costs 2(n+1) backslashes and a content quote 2n+1, so a quote closes the
      // value exactly when the backslash run before it is n modulo 2(n+1)
      for (let p = text.indexOf('"', start); p >= 0; p = text.indexOf('"', p + 1)) { let b = 0; while (p - 1 - b >= start && text[p - 1 - b] === '\\') b++; if (b % (2 * (n + 1)) === n) { end = p - n; break; } }
      out.push({ start, end }); // end -1 = unterminated
    }
  }
  return out;
};
const redactJsonValues = (text) => {
  const spans = jsonValues(text).sort((a, b) => b.start - a.start); let t = text, last = Infinity;
  for (const { start, end } of spans) { if (end < 0 || end > last) continue; if (t.slice(start, end) !== '[REDACTED]') t = t.slice(0, start) + '[REDACTED]' + t.slice(end); last = start; }
  return t;
};
const rules = (secrets) => [
  ...[...new Set(forms(secrets))].map((s) => [new RegExp(esc(s), 'g'), '[REDACTED]']),
  // plain "name: value" header lines (console text, HTTP dumps)
  [new RegExp('((?:^|[\\s{,;\'(])' + HEADER + '\\s*:\\s*)(?!\\\\*")[^\\r\\n"\',}]+', 'gim'), '$1[REDACTED]'],
  [new RegExp('("selector":"(?:[^"\\\\]|\\\\.)*?(?:password|' + Buffer.from('密码').toString('latin1') + ')(?:[^"\\\\]|\\\\.)*"[^}]*?"value":")(?:[^"\\\\]|\\\\.)*"', 'gi'), '$1[REDACTED]"'],
  [/Bearer\s+[A-Za-z0-9._~+\/=-]+/g, 'Bearer [REDACTED]'],
  [/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/g, '[REDACTED_JWT]'],
  [/([?&](?:token|access_token|refresh_token|apikey|signature|sig|X-Amz-[A-Za-z-]+|X-Goog-[A-Za-z-]+)=)[^&"'\s\\<>]+/gi, '$1[REDACTED]'],
  [/(sb-[a-z0-9]+-auth-token(?:[.-][a-z0-9]+)*=)[^;"\s\\]+/gi, '$1[REDACTED]'],
  [/base64-[A-Za-z0-9+\/=_-]{40,}/g, '[REDACTED_B64]'],
];
const redactText = (text, secrets) => { let t = String(text); for (const [re, rep] of rules(secrets)) t = t.replace(re, rep); return redactJsonValues(t); };
const leaks = (text, secrets) => {
  const hits = [];
  for (const s of new Set(forms(secrets))) if (text.includes(s)) hits.push('persona-password');
  if (/Bearer\s+(?!\[REDACTED)[A-Za-z0-9._-]{16,}/.test(text)) hits.push('bearer');
  if (/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\./.test(text)) hits.push('jwt');
  for (const { start, end } of jsonValues(text)) {
    if (end < 0) { hits.push('unterminated-sensitive-value'); continue; }
    const v = text.slice(start, end); if (v !== '[REDACTED]' && v !== '') hits.push('sensitive-json-value');
  }
  if (new RegExp('(?:^|[\\s{,;\'(])' + HEADER + '\\s*:\\s*(?!\\\\*"|\\[REDACTED)[^\\r\\n"\',}\\s]{4,}', 'im').test(text)) hits.push('header-line');
  if (/[?&](?:token|access_token|refresh_token|apikey|signature|sig|X-Amz-[A-Za-z-]+|X-Goog-[A-Za-z-]+)=(?!\[REDACTED)[^&"'\s\\<>]{4,}/i.test(text)) hits.push('url-token');
  if (/sb-[a-z0-9]+-auth-token(?:[.-][a-z0-9]+)*=(?!\[REDACTED)[^;"\s\\]{8,}/i.test(text)) hits.push('auth-cookie');
  if (/base64-[A-Za-z0-9+\/=_-]{40,}/.test(text)) hits.push('b64-session');
  // a value cut at a backslash leaves its remainder after the marker: anything but an (escaped) closing quote fails closed
  if (/\[REDACTED\]\\+(?!\\*")/.test(text)) hits.push('redacted-remainder');
  return hits;
};

const isImage = (b) => (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) || (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) || (b.slice(0, 4).toString('latin1') === 'RIFF' && b.slice(8, 12).toString('latin1') === 'WEBP');

const readAll = (zipPath) => new Promise((res, rej) => yauzl.open(zipPath, { lazyEntries: true }, (e, z) => {
  if (e) return rej(e); const out = [];
  z.on('entry', (en) => { if (/\/$/.test(en.fileName)) return z.readEntry(); z.openReadStream(en, (err, s) => { if (err) return rej(err); const b = []; s.on('data', (c) => b.push(c)); s.on('error', rej); s.on('end', () => { out.push([en.fileName, Buffer.concat(b)]); z.readEntry(); }); }); });
  z.on('end', () => { if (z.isOpen) z.close(); }); z.on('close', () => res(out)); z.on('error', rej); z.readEntry();
}));

// Redaction must never break evidence: every whole entry and every line that parsed as JSON before must still parse.
const parses = (s) => { try { JSON.parse(s); return true; } catch { return false; } };
const structureBroken = (before, after) => {
  if (before === after) return false;
  if (parses(before) && !parses(after)) return true;
  const a = before.split('\n'), b = after.split('\n'); if (a.length !== b.length) return true;
  return a.some((l, i) => l !== b[i] && parses(l) && !parses(b[i]));
};

// Windows: antivirus or a just-closed handle can briefly lock a file; retry transient errors, never skip the move.
function renameRetry(from, to) {
  for (let i = 0; ; i++) {
    try { fs.renameSync(from, to); return; }
    catch (e) { if (i >= 20 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100 * (i + 1)); }
  }
}

async function sanitize(zipPath, secrets) {
  const tmp = zipPath + '.tmp';
  // returns the files that could NOT be deleted (caller must report them for manual quarantine)
  const wipe = () => [zipPath, tmp].filter((f) => { try { fs.rmSync(f, { force: true }); } catch {} return fs.existsSync(f); });
  const fail = (why) => { const left = wipe(); return { ok: false, leaks: why, undeleted: left }; };
  try {
    const z = new yazl.ZipFile(); const broken = [];
    for (const [name, buf] of await readAll(zipPath)) {
      if (isImage(buf)) { z.addBuffer(buf, name); continue; }
      const before = buf.toString('latin1'), after = redactText(before, secrets);
      if (structureBroken(before, after)) broken.push('json-structure-broken@' + name);
      z.addBuffer(Buffer.from(after, 'latin1'), name);
    }
    if (broken.length) return fail(broken);
    await new Promise((res, rej) => { z.outputStream.on('error', rej).pipe(fs.createWriteStream(tmp)).on('close', res).on('error', rej); z.end(); });
    renameRetry(tmp, zipPath);
    const found = new Set();
    for (const [name, buf] of await readAll(zipPath)) for (const h of leaks(buf.toString('latin1'), secrets)) found.add(h + '@' + name);
    if (found.size) return fail([...found]);
    return { ok: true };
  } catch (e) { return fail(['sanitizer-error: ' + String(e.message).split('\n')[0]]); }
}
// Independent post-run verification: rescans every zip in an evidence folder and requires the raw holding folder to be
// empty. Any unreadable zip, any surviving credential or any leftover raw file is a failure.
// `expected` (optional): trace file names that must be present, so a lost trace cannot pass as "no problems".
async function verifyTraces(traceDir, rawDir, secrets, expected = []) {
  const bad = [];
  const zips = fs.existsSync(traceDir) ? fs.readdirSync(traceDir) : [];
  for (const f of zips) {
    const p = path.join(traceDir, f);
    if (!f.endsWith('.zip')) { bad.push('unexpected-file@' + f); continue; }
    try { for (const [name, buf] of await readAll(p)) for (const h of leaks(buf.toString('latin1'), secrets)) bad.push(h + '@' + f + ':' + name); }
    catch (e) { bad.push('unreadable@' + f + ': ' + String(e.message).split('\n')[0]); }
  }
  const raw = rawDir && fs.existsSync(rawDir) ? fs.readdirSync(rawDir) : [];
  for (const f of raw) bad.push('unsanitized-raw-left@' + path.join(rawDir, f));
  for (const f of expected) if (!zips.includes(f)) bad.push('expected-trace-missing@' + f);
  return { ok: bad.length === 0, traces: zips.length, problems: bad };
}
const loadSecrets = (usersFile) => {
  const u = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
  if (!Array.isArray(u) || !u.length || u.some((x) => typeof x.pw !== 'string' || x.pw.length < 8)) throw new Error('persona credential file is not a non-empty array of {pw}');
  return u.map((x) => x.pw);
};
module.exports = { renameRetry, sanitize, verifyTraces, loadSecrets, leaks, redactText, structureBroken, wipeFiles: (files) => files.filter((f) => { try { fs.rmSync(f, { force: true }); } catch {} return fs.existsSync(f); }) };
