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
const rules = (secrets) => [
  ...[...new Set(forms(secrets))].map((s) => [new RegExp(esc(s), 'g'), '[REDACTED]']),
  [new RegExp('(' + Q + 'name' + Q + '\\s*:\\s*' + Q + HEADER + Q + '\\s*,\\s*' + Q + 'value' + Q + '\\s*:\\s*' + Q + ')[^"\\\\]*', 'gi'), '$1[REDACTED]'], // stop at any backslash: never consume an escaped closing quote
  [new RegExp('(' + Q + HEADER + Q + '\\s*:\\s*' + Q + ')[^"\\\\]*', 'gi'), '$1[REDACTED]'], // stop at any backslash: never consume an escaped closing quote
  // plain "name: value" header lines (console text, HTTP dumps)
  [new RegExp('((?:^|[\\s{,;\'(])' + HEADER + '\\s*:\\s*)(?!\\\\*")[^\\r\\n"\',}]+', 'gim'), '$1[REDACTED]'],
  [new RegExp('("selector":"(?:[^"\\\\]|\\\\.)*?(?:password|' + Buffer.from('密码').toString('latin1') + ')(?:[^"\\\\]|\\\\.)*"[^}]*?"value":")(?:[^"\\\\]|\\\\.)*"', 'gi'), '$1[REDACTED]"'],
  [/Bearer\s+[A-Za-z0-9._~+\/=-]+/g, 'Bearer [REDACTED]'],
  [/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/g, '[REDACTED_JWT]'],
  [new RegExp('(' + TOKEN_KEY + Q + '\\s*:\\s*' + Q + ')[^"\\\\]*', 'gi'), '$1[REDACTED]'], // stop at any backslash: never consume an escaped closing quote
  [/([?&](?:token|access_token|refresh_token|apikey|signature|sig|X-Amz-[A-Za-z-]+|X-Goog-[A-Za-z-]+)=)[^&"'\s\\<>]+/gi, '$1[REDACTED]'],
  [/(sb-[a-z0-9]+-auth-token(?:[.-][a-z0-9]+)*=)[^;"\s\\]+/gi, '$1[REDACTED]'],
  [/base64-[A-Za-z0-9+\/=_-]{40,}/g, '[REDACTED_B64]'],
];
const redactText = (text, secrets) => { let t = String(text); for (const [re, rep] of rules(secrets)) t = t.replace(re, rep); return t; };
const leaks = (text, secrets) => {
  const hits = [];
  for (const s of new Set(forms(secrets))) if (text.includes(s)) hits.push('persona-password');
  if (/Bearer\s+(?!\[REDACTED)[A-Za-z0-9._-]{16,}/.test(text)) hits.push('bearer');
  if (/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\./.test(text)) hits.push('jwt');
  if (new RegExp(TOKEN_KEY + Q + '\\s*:\\s*' + Q + '(?!\\[REDACTED)[^"\\\\]{8,}', 'i').test(text)) hits.push('token-field');
  if (new RegExp(Q + HEADER + Q + '\\s*(?:,\\s*' + Q + 'value' + Q + ')?\\s*:\\s*' + Q + '(?!\\[REDACTED)[^"\\\\]{4,}', 'i').test(text)) hits.push('header-value');
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

async function sanitize(zipPath, secrets) {
  const tmp = zipPath + '.tmp';
  // returns the files that could NOT be deleted (caller must report them for manual quarantine)
  const wipe = () => [zipPath, tmp].filter((f) => { try { fs.rmSync(f, { force: true }); } catch {} return fs.existsSync(f); });
  const fail = (why) => { const left = wipe(); return { ok: false, leaks: why, undeleted: left }; };
  try {
    const z = new yazl.ZipFile();
    for (const [name, buf] of await readAll(zipPath)) z.addBuffer(isImage(buf) ? buf : Buffer.from(redactText(buf.toString('latin1'), secrets), 'latin1'), name);
    await new Promise((res, rej) => { z.outputStream.on('error', rej).pipe(fs.createWriteStream(tmp)).on('close', res).on('error', rej); z.end(); });
    fs.renameSync(tmp, zipPath);
    const found = new Set();
    for (const [name, buf] of await readAll(zipPath)) for (const h of leaks(buf.toString('latin1'), secrets)) found.add(h + '@' + name);
    if (found.size) return fail([...found]);
    return { ok: true };
  } catch (e) { return fail(['sanitizer-error: ' + String(e.message).split('\n')[0]]); }
}
module.exports = { sanitize, leaks, redactText, wipeFiles: (files) => files.filter((f) => { try { fs.rmSync(f, { force: true }); } catch {} return fs.existsSync(f); }) };
