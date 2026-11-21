// Pure invite rules for project-invite. Mirrors public.claim_project_invite
// (migration 202609260007): token = 64 hex chars from create_supplier_room_invite,
// stored only as sha256(token) in project_invites.token_hash.

export type InviteRow = {
  id: string;
  project_id: string;
  room_id: string;
  target_organization_id: string;
  invited_role: string;
  invited_email: string | null;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
};

export type InviteState = "ok" | "not_found" | "revoked" | "used" | "expired";

export const PASSWORD_MIN_LENGTH = 10;
// GoTrue hashes with bcrypt, which only uses the first 72 bytes.
export const PASSWORD_MAX_BYTES = 72;
export const DISPLAY_NAME_MAX_LENGTH = 120;
// Unbound bootstrap is disabled. Attempt budgets are locked in the database.
export function bootstrapPeerAddress(
  info: { remoteAddr?: { hostname?: string } } = {},
  headers = new Headers(),
  policy: { requireTrustedProxy?: boolean; trustedProxyIps?: string[] } = {},
): string | null {
  const normalize = (value: string): string | null => {
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) {
      return value.split(".").every(part => Number(part) <= 255) ? value.split(".").map(Number).join(".") : null;
    }
    try {
      const hostname = new URL(`http://[${value}]/`).hostname;
      return hostname.startsWith("[") ? hostname.slice(1, -1) : null;
    } catch { return null; }
  };
  const peer = normalize(info.remoteAddr?.hostname || "");
  if (!peer) return null;
  if (!policy.requireTrustedProxy) return peer; // local direct route ignores every forwarding header
  const trusted = new Set((policy.trustedProxyIps || []).map(normalize).filter(Boolean));
  if (!trusted.has(peer)) return null; // no shared proxy/unknown fallback bucket
  const raw = headers.get("x-forwarded-for");
  if (!raw || raw.length > 1024) return null;
  const chain = raw.split(",").map(value => normalize(value.trim()));
  if (!chain.length || chain.some(value => !value)) return null;
  // Walk right to left over the explicitly trusted proxy hops. Caller-prepended
  // values cannot replace the closest untrusted client address.
  for (const address of chain.reverse()) if (!trusted.has(address)) return address;
  return null;
}

const TOKEN_RE = /^[0-9a-f]{64}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isWellFormedToken(token: unknown): token is string {
  return typeof token === "string" && TOKEN_RE.test(token);
}

export function inviteState(invite: InviteRow | null, now: Date): InviteState {
  if (!invite) return "not_found";
  if (invite.revoked_at) return "revoked";
  if (invite.used_at) return "used";
  if (new Date(invite.expires_at).getTime() <= now.getTime()) return "expired";
  return "ok";
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254 || !EMAIL_RE.test(email)) return null;
  return email;
}

export function cleanDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value
    .normalize("NFKC")
    // deno-lint-ignore no-control-regex -- stripping control characters is the point
    .replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, "")
    .trim()
    .slice(0, DISPLAY_NAME_MAX_LENGTH);
  return name || null;
}

export type BootstrapInput = { email: string; password: string; displayName: string | null };

export type BootstrapCheck =
  | { ok: true; value: BootstrapInput }
  | { ok: false; status: number; error: string };

export function checkBootstrapInput(
  body: Record<string, unknown>,
  invite: Pick<InviteRow, "invited_email">,
): BootstrapCheck {
  if (!invite.invited_email) return { ok: false, status: 403, error: "Email-bound invitation required." };
  const email = normalizeEmail(body.email);
  if (!email) return { ok: false, status: 400, error: "Enter a valid email address." };

  const password = body.password;
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, status: 400, error: "Password must be at least 10 characters." };
  }
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    return { ok: false, status: 400, error: "Password is too long." };
  }

  if (invite.invited_email && invite.invited_email.toLowerCase() !== email) {
    return { ok: false, status: 403, error: "This invitation is for a different email address." };
  }

  return { ok: true, value: { email, password, displayName: cleanDisplayName(body.displayName) } };
}

export function isEmailExistsError(error: { code?: string; message?: string; status?: number } | null): boolean {
  if (!error) return false;
  if (error.code === "email_exists" || error.code === "user_already_exists") return true;
  return /already (been )?registered|already exists/i.test(error.message ?? "");
}
