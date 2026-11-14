'use strict';
// Single place that decides which hosts a test run may touch. Used by the runner,
// the browser preload (network level) and the restricted Playwright tool server.
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '..');
const profilePath = path.join(__dirname, '..', 'profile', 'sourcerating_playwright_e2e.json');
const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
const T = profile.targets;

class BoundaryError extends Error { constructor(m) { super(m); this.name = 'BoundaryError'; this.boundary = true; } }

const supabaseRef = (host) => { const m = /^([a-z0-9]{20})\.supabase\.(co|in)$/.exec(host); return m ? m[1] : null; };

// kind: 'app' | 'backend' | 'other-denied'
function classifyHost(host) {
  host = String(host || '').toLowerCase();
  if (T.localHosts.includes(host)) return { ok: true, kind: 'app', host };
  if (T.previewHosts.includes(host)) return { ok: true, kind: 'app', host };
  const ref = supabaseRef(host) || (/^([a-z0-9]{20})\.(storage|functions)\.supabase\.co$/.exec(host) || [])[1] || null;
  if (ref) {
    if (T.supabaseDeniedRefs[ref]) return { ok: false, boundary: true, host, why: `denied Supabase project ${ref}: ${T.supabaseDeniedRefs[ref]}` };
    if (T.supabaseAllowedRefs.includes(ref)) return { ok: true, kind: 'backend', host };
    return { ok: false, boundary: true, host, why: `Supabase project ${ref} is not on the allow-list` };
  }
  if (/\.supabase\.(co|in)$/.test(host)) return { ok: false, boundary: true, host, why: 'unrecognised Supabase host' };
  if (/\.vercel\.app$/.test(host)) return { ok: false, boundary: true, host, why: 'Vercel host not on the allow-list' };
  return { ok: false, boundary: false, host, why: 'host not allowed' };
}

function assertUrl(u, label) {
  let url; try { url = new URL(u); } catch { throw new BoundaryError(`${label}: not a URL`); }
  if (url.username || url.password) throw new BoundaryError(`${label}: credentials in URL are not allowed`);
  const c = classifyHost(url.hostname);
  if (!c.ok) throw new BoundaryError(`${label}: ${url.hostname} — ${c.why}`);
  const local = T.localHosts.includes(url.hostname);
  if (!local && url.protocol !== 'https:') throw new BoundaryError(`${label}: hosted targets must use https`);
  return c;
}

function assertEnv(env) {
  if (env.B_URL) assertUrl(env.B_URL, 'B_URL');
  else throw new BoundaryError('B_URL is required');
  if (env.B_SUPABASE_URL) {
    const c = assertUrl(env.B_SUPABASE_URL, 'B_SUPABASE_URL');
    if (c.kind !== 'backend') throw new BoundaryError('B_SUPABASE_URL must be an allow-listed Supabase project');
  }
  for (const k of Object.keys(env)) {
    for (const pat of profile.forbiddenEnvPatterns) if (k.includes(pat) || String(env[k]).startsWith('sb_secret_')) throw new BoundaryError(`forbidden credential in environment: ${k}`);
  }
}

function childEnv(env) {
  const out = {};
  for (const k of profile.childEnvAllowList) if (env[k] !== undefined) out[k] = env[k];
  return out;
}

module.exports = { ROOT, profile, BoundaryError, classifyHost, assertUrl, assertEnv, childEnv };
