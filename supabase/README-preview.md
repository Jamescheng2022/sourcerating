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
| SR_TRUSTED_PROXY_IPS | Exact comma-separated immediate/intermediate trusted proxy IPs |

Before enabling hosted bootstrap, H1 must verify Deno connection metadata and
the platform forwarding chain using two independent clients and a forged
prefix. The configured proxy must append or overwrite the real client address;
the immediate peer must match the explicit trust list. The resolver walks from
the trusted end and selects the nearest untrusted address. Local direct peers
ignore caller forwarding headers. Missing, malformed or untrusted hosted
identity fails with 503; there is no shared fallback proxy bucket. Do not guess
proxy IPs or broadly trust caller headers. Hosted topology verification remains
a required H1 gate, not a local test claim.

The database locks each invite and spends its 12-attempt/10-minute token budget
before its 60-attempt/10-minute client-IP budget. Exhausted tokens spend no IP
budget. Counters store hashes, are private, and have no client grants.

Invite links contain only the invite token, never protection bypass parameters.
Use the approved Vercel SSO route for protected preview access. Data remains
synthetic and AI credentials absent. Owner legal text (L-3) and stage-3 release
work (L-5) remain outside B8.
