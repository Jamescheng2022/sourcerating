# Preview configuration contract

Local acceptance does not authorize a hosted operation. H1 must use a new free
preview project, never the existing production backend. Both builders reject
that backend. The historical native pilot handoff predates this rule; its
APK/address guidance is superseded by the configurable B3/B7 build path.

`config.toml` is local configuration. `hosted-auth-policy.toml` is explicit
desired hosted policy, not an automatically applied setting. H1 must configure
and read back public signup off, anonymous sign-in off, email/password provider
on, minimum password 10, and exact site/redirect allowlist. The email provider's
`enable_signup` enables email authentication; `[auth].enable_signup` controls
public creation. Invites are email-bound only. Unused legacy unbound tokens fail
in preview, bootstrap, reservation and claim paths. Already-used claims retain
their existing membership replay behavior. Bound tokens still authorize
preparation for their nominated address; this does not prove inbox verification
by the invitee. Self-service reset uses existing Supabase Auth, not a new sender.
Local Mailpit captures messages without delivery. Hosted delivery/provider
configuration remains an owner-approved H1 responsibility.

Required environment names (values come through the approved environment):

| Name | Purpose |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | New preview API origin supplied at Web build time |
| NEXT_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Public client key, never service key |
| SR_PUBLIC_SUPABASE_URL | Public API origin for signed downloads |
| SR_ALLOWED_ORIGINS | Exact comma-separated Web origins for function CORS |
| SR_SITE_URL | Exact Web site URL for Auth |
| SR_AUTH_REDIRECT_URL | Exact password-recovery route for Auth allowlist |
| SR_INVITE_RELAY_SECRET | Dedicated 32-byte HMAC key (64 lowercase hex), server-only on both platforms |
| SR_INVITE_RELAY_PROJECT_REF | Exact authorized test project; no generic hosted fallback |

## H1 signed invitation relay (Owner decision 2026-10-11)

Both Web invite preview and bootstrap use same-origin `/api/project-invite`.
Vercel Standard Protection/SSO must remain enabled, with no bypass/share tokens
or unprotected preview aliases. The server only runs on the authorized continuation
branch in a Vercel preview against the exact H1 project. Production, other branches,
other projects, missing secrets and inherited loopback settings fail closed. Store
its secret as a sensitive branch-specific preview variable, never `NEXT_PUBLIC_*`.
Do not give this server a Supabase service-role key. The fixed relay accepts only
JSON invite actions, checks origin/Host, bounds the body and forbids redirects.

The relay signs protocol version, POST, fixed function path, raw-body SHA256,
project ref, Unix timestamp, random 128-bit nonce and visitor hash using HMAC-SHA256.
The Supabase function uses Web Crypto to verify before any invite lookup, limiter,
account preparation or privileged RPC. Signed timestamps have a +/-60-second bound.
A service-only RPC atomically inserts the nonce hash in a private RLS table; the
unique key rejects reuse across parallel isolates/restarts. Replay rows are retained;
no deletion/cleanup job was introduced. Monitor their storage before any future launch.

The existing token-first RPC is unchanged: 12 attempts/invite/10 minutes, then 60
attempts/visitor/10 minutes. Hosted visitor identity comes from a separate-domain
HMAC-authenticated, HttpOnly, Secure, SameSite=Strict browser cookie; its signed
hash is bound to each request. Neither relay nor hosted verifier uses raw IP/XFF
or `SR_TRUSTED_PROXY_IPS`. Clearing cookies resets this secondary visitor identity;
it is not a network quota or authentication. The atomic token budget is independent
of this identity and cannot be reset by cookie rotation. Vercel SSO, not this cookie,
authorizes access to the signing route. Browser passwords/tokens are not logged.

Unsigned direct calls are permitted only on the recognized local HTTP stack to
preserve native/regression testing; local signed calls exercise the same verifier.
Every hosted call requires the dedicated relay key and the exact authorized project.
Hosted native invitation routing is separate scope; the local native path is preserved.

Invite links contain only the invite token, never protection bypass parameters.
Use the approved Vercel SSO route for protected preview access. Data remains
synthetic and AI credentials absent. Owner legal text (L-3) and stage-3 release
work (L-5) remain outside B8.
