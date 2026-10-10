# Local invite abuse regressions

The Deno script refuses every target except the local stack. Credentials are
injected from outside Git, and synthetic fixtures are retained. `cap` proves
zero account creation from 12 concurrent legacy unbound requests and privileged
reservation/counter denials. `uniform` adds bound existing/new response parity,
password preservation, arbitrary-address denial, actual HTTP throttling despite
forged headers, and rate regressions. `rates` proves atomic 12-token/60-peer
limits, independence, window recovery, private grants, and 100 concurrent
exhausted-token denials consuming no peer budget. Counter tests need Docker
execution in this lane's local database only and advance only synthetic windows.
No fixture deletion, real peer-window reset or remote operation is performed.

Unbound creation is disabled rather than retaining a three-account allowance.
Bound preparation returns a uniform 200 body for new/existing accounts and a
uniform 429 when limited. See `../README-preview.md` for the hosted trust gate.
