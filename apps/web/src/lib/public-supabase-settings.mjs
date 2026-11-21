/** Pure validation shared by Next config and browser/server config. Never log input values. */
export function publicSupabaseSettings(url, anonKey, publishableKey, hostedBuild = false) {
  if (!url?.trim() || !(anonKey?.trim() || publishableKey?.trim())) {
    throw new Error('Missing build configuration: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) in the deployment Preview environment, then rebuild. See docs/PREVIEW_CONFIGURATION.md.');
  }
  if (anonKey && publishableKey && anonKey !== publishableKey) {
    throw new Error('Set only one public Supabase key variable, or give both the same value.');
  }
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid backend origin.'); }
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname);
  if (parsed.hostname === 'qnozpurjtgkmwtvsrjoi.supabase.co') {
    throw new Error('The existing production backend is excluded from pilot builds.');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/' ||
      (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && loopback))) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be an HTTPS origin (HTTP loopback is for local tests only).');
  }
  if (hostedBuild && loopback) throw new Error('Hosted previews require an authorized isolated HTTPS backend; loopback refers to the viewer or build machine, not the cloud test stack.');
  const key = anonKey || publishableKey;
  let isAnon = false;
  try {
    const parts = key.split('.');
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    isAnon = parts.length === 3 && payload.role === 'anon';
  } catch { /* Not a legacy public JWT. */ }
  if (key !== key.trim() || !(/^sb_publishable_[A-Za-z0-9_-]+$/.test(key) || isAnon)) {
    throw new Error('Use only a Supabase public anon or sb_publishable_ key. Service-role and secret keys must never enter NEXT_PUBLIC variables.');
  }
  // Shape validation is not signature verification or evidence of backend connectivity.
  return { url: parsed.origin, publicKey: key };
}
