# Local Web acceptance

`s2-web-e2e.cjs` uses Playwright 1.63.0 from the lane's `tools/node_modules`
(override `S2_PLAYWRIGHT_MODULE` with the installed module path). It launches an
isolated headless Chrome context, never the owner's browser profile. Override
`S2_BROWSER_PATH` to use another installed Chromium executable.

Start the reduced local Supabase stack and seed it with `supabase/scripts/s2-seed.ts`.
The script refuses any API URL except `http://127.0.0.1:54321`. Test passwords
come from `../secrets/s2-local-passwords.json` outside the repo, with keys
`S2_BUYER_PASSWORD` and `S2_SUPPLIER_PASSWORD`. Never commit that file.

Build Web with the local `NEXT_PUBLIC_SUPABASE_URL` and public anon key. With
port 3000 free, run from `apps/web`: `node scripts/s2-web-e2e.cjs e2e`.
The script starts the production server, exercises real UI/API/storage, restarts
only its own server, and closes its server/browser on success or failure. It
removes AI keys from the server environment. No requests are mocked; outbound
browser requests are refused and fail acceptance.

Reports, screenshots and synthetic PDF/XLSX/PNG fixtures go to
`../carryover/B5-artifacts` outside Git. No traces, passwords, JWTs, signed URLs,
invite tokens or session state are written into reports. Fixtures and accounts
are retained, so reruns use unique names. Stop only the lane's Supabase project
after acceptance; leave Docker Desktop running.

After applying the inquiry migration, run `node scripts/s2-web-e2e.cjs inquiries`.
It exercises the real form and buyer Needs You listing, two same-organization
submitters, direct RLS/RPC denials, idempotent retry, refresh/restart and mobile
access. Its report/screenshots go to `../carryover/B6-artifacts`.

After B8 migrations, `node scripts/s2-web-e2e.cjs review` tests retired public
pages/search and compiled marketing assets, authenticated sender snapshots and
spoof denials, email-bound invites, build target guards, signup-off policy and
real recovery through local Mailpit. Enable Mailpit in the reduced local stack;
it captures Auth messages without external delivery. Recovery uses a fresh
synthetic seeded account, preserving the two existing seed passwords. Tokens,
reset links and passwords stay out of reports. Set `S2_EVIDENCE_DIR` to a fresh
outside-repo directory for each run. Reports include progress as well as final
results. Run Web and emulator acceptance serially to avoid memory pressure.

## Archive download browser checks

Run `node scripts/s2-web-e2e.cjs downloads` on the isolated local stack after build. It creates a synthetic empty room and exercises actual UI downloads plus clearly labelled response fixtures and cancellation/privacy checks. This mode does not call room-file-gateway. The `e2e` mode contains the actual uploaded-file archive assertion and must remain blocked until the previously denied network policy has changed and is confirmed applied. Never substitute the fixture pass for that live chain.
