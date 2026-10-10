# Local invite abuse regressions

`s2-invite-limits.ts` requires the seeded local stack and environment variables
used by `s2-rls.ts`. It hard-refuses every URL except `http://127.0.0.1:54321`.
Accounts/organizations/rooms use synthetic `[S2-TEST]` data and are retained.

Run with the lane Deno cache, network permission only for local port 54321,
and environment access. `S2_INVITE_TEST_PHASE` selects:

- `cap`: 12 concurrent real HTTP bootstrap calls, positive Auth inventory,
  exactly three created accounts, atomic counter, privileged-RPC denials.
- `uniform`: cap checks plus response parity for existing/new/cap-exhausted
  emails, different-password preservation, actual HTTP token throttling,
  concurrent counters, per-IP cap across multiple tokens, window recovery,
  private counters and invalid-input attempt counting.
- `rates`: counter/window/private-schema regressions alone.

The last two modes also require `--allow-run=docker`. They execute `psql`
only inside `supabase_db_sourcerating-l1-stage2`, advance **synthetic fixture**
windows and check grants. They never delete fixtures, reset the real HTTP peer
bucket, change the machine clock or contact a remote database. Real HTTP
traffic is subject to the production limiter: wait for the ten-minute window
if repeated runs exhaust the shared local peer bucket.

The database enforces at most three lifetime creation reservations for an
unbound invite, 12 bootstrap attempts per token per ten minutes, and 60 attempts
per transport-peer IP per ten minutes across all tokens. Reservation failures
and existing-email attempts are not refunded. Clients receive exactly
`200 {"ok":true}` for prepared/existing/cap-exhausted addresses and a uniform
429 when rate-limited. These responses disclose no account-existence flag.

Peer IP comes from Deno's connection metadata. Caller forwarding headers are
ignored. Behind a proxy the peer bucket is conservatively shared; missing
metadata uses one shared fallback bucket. A future hosted deployment must
verify its proxy identity route before changing this policy; it must never
start trusting caller-supplied IP headers. Raw peer IPs are not stored; counters
live in an unexposed private schema with RLS and no client grants.
