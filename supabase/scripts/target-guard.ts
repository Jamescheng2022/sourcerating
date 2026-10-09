// Refuses to point test tooling at anything but the local stack, unless a
// specific non-production project ref is named explicitly (stage 2 task H1).

export const PRODUCTION_PROJECT_REFS = ["qnozpurjtgkmwtvsrjoi"]; // sourcerating-p1

export function checkSeedTarget(supabaseUrl: string, allowedRemoteRef?: string): string | null {
  let url: URL;
  try {
    url = new URL(supabaseUrl);
  } catch {
    return "SUPABASE_URL is not a valid URL";
  }
  const host = url.hostname.toLowerCase();
  if (PRODUCTION_PROJECT_REFS.some((ref) => host.includes(ref))) {
    return "refusing to touch the production project sourcerating-p1";
  }
  if (host === "127.0.0.1" || host === "localhost") return null;
  if (allowedRemoteRef && host === `${allowedRemoteRef.toLowerCase()}.supabase.co`) {
    return PRODUCTION_PROJECT_REFS.includes(allowedRemoteRef.toLowerCase())
      ? "refusing to touch the production project sourcerating-p1"
      : null;
  }
  return `refusing non-local target ${host}; set S2_ALLOW_REMOTE_PROJECT_REF for a named test project`;
}
