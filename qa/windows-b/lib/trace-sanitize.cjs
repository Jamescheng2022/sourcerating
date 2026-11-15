'use strict';
// Rewrites a Playwright trace zip so that credentials never reach evidence, then re-scans it.
// Redacts: persona passwords, Authorization/apikey/cookie header values, JWTs, Supabase token fields and auth cookies.
// If anything sensitive survives the rewrite, the trace is deleted and the caller must treat the run as STOPPED.
const fs = require('fs'), path = require('path');
const { yauzl, yazl } = require(require.resolve('playwright-core/lib/zipBundle', { paths: [path.join(__dirname, '..', '..', '..', 'apps', 'web')] }));

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rules = (secrets) => [
  ...secrets.filter(Boolean).map((s) => [new RegExp(esc(s), 'g'), '[REDACTED]']),
  [/("name"\s*:\s*"(?:authorization|apikey|cookie|set-cookie|x-supabase-auth)"\s*,\s*"value"\s*:\s*")[^"]*"/gi, '$1[REDACTED]"'],
  [new RegExp('("selector":"(?:[^"\\\\]|\\\\.)*?(?:password|' + Buffer.from('密码').toString('latin1') + ')(?:[^"\\\\]|\\\\.)*"[^}]*?"value":")(?:[^"\\\\]|\\\\.)*"', 'gi'), '$1[REDACTED]"'],
  [/Bearer\s+[A-Za-z0-9._~+\/=-]+/g, 'Bearer [REDACTED]'],
  [/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/g, '[REDACTED_JWT]'],
  [/((?:access_token|refresh_token|provider_token|provider_refresh_token|password|token_hash)\\?"\s*:\s*\\?")[^"\\]*/gi, '$1[REDACTED]'],
  [/(sb-[a-z0-9]+-auth-token(?:\.\d+)?=)[^;"\s]+/gi, '$1[REDACTED]'],
  [/base64-[A-Za-z0-9+\/=_-]{40,}/g, '[REDACTED_B64]'],
];
const leaks = (text, secrets) => {
  const hits = [];
  for (const s of secrets.filter(Boolean)) if (text.includes(s)) hits.push('persona-password');
  if (/Bearer\s+(?!\[REDACTED)[A-Za-z0-9._-]{16,}/.test(text)) hits.push('bearer');
  if (/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\./.test(text)) hits.push('jwt');
  if (/(?:access_token|refresh_token)\\?"\s*:\s*\\?"(?!\[REDACTED)[^"\\]{8,}/.test(text)) hits.push('token-field');
  if (/sb-[a-z0-9]+-auth-token(?:\.\d+)?=(?!\[REDACTED)[^;"\s]{8,}/i.test(text)) hits.push('auth-cookie');
  return hits;
};

const readAll = (zipPath) => new Promise((res, rej) => yauzl.open(zipPath, { lazyEntries: true }, (e, z) => {
  if (e) return rej(e); const out = [];
  z.on('entry', (en) => { if (/\/$/.test(en.fileName)) return z.readEntry(); z.openReadStream(en, (err, s) => { if (err) return rej(err); const b = []; s.on('data', (c) => b.push(c)); s.on('end', () => { out.push([en.fileName, Buffer.concat(b)]); z.readEntry(); }); }); });
  z.on('end', () => { if (z.isOpen) z.close(); }); z.on('close', () => res(out)); z.on('error', rej); z.readEntry();
}));

async function sanitize(zipPath, secrets) {
  const R = rules(secrets); const z = new yazl.ZipFile(); const tmp = zipPath + '.tmp';
  for (const [name, buf] of await readAll(zipPath)) {
    let t = buf.toString('latin1'); for (const [re, rep] of R) t = t.replace(re, rep);
    z.addBuffer(Buffer.from(t, 'latin1'), name);
  }
  await new Promise((res, rej) => { z.outputStream.pipe(fs.createWriteStream(tmp)).on('close', res).on('error', rej); z.end(); });
  fs.renameSync(tmp, zipPath);
  const found = new Set();
  for (const [name, buf] of await readAll(zipPath)) for (const h of leaks(buf.toString('latin1'), secrets)) found.add(h + '@' + name);
  if (found.size) { fs.rmSync(zipPath, { force: true }); return { ok: false, leaks: [...found] }; }
  return { ok: true };
}
module.exports = { sanitize, leaks };
