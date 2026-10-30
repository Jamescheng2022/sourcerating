# SourceRating GCP real AI pilot — 2026-10-30

## Current result

The existing `apps/web` app is running on the owner's new `anthai-ai-vps-v2` VM with a fresh isolated self-hosted Supabase stack. This is a synthetic-user pilot, not a production release.

Test URL: https://therapeutic-evident-obligation-saturday.trycloudflare.com/project-room
Test room: `[S2-TEST] Live AI Project Room` (`52000000-0000-4000-8000-0000000000e3`).
Account passwords are delivered privately to the owner and are not in this repository.

No production database was copied or modified. LushuPai, the existing SourceRating website and the managed Supabase projects were not paused or repointed. No Supabase subscription was purchased.

## Deployment

- Existing app branch: `pilot/real-ai-acceptance-20261028`.
- Original app snapshot: `e6eb24b930f4927c5b1fc6040ca76d4d310e5b56`.
- Supabase Docker source: `57b659d47f0a459b7bd734412113306de850c627`.
- VM: 2 vCPU, approximately 8 GB RAM, 30 GB disk; approximately 16 GB available after deployment. This deliberately reduced test stack is below the full-stack documented 40 GB disk minimum and is not sized for production.
- Docker Engine 29.8.2; Compose 5.6.1; Node 22.23.4. Ten deployed images are pinned to their observed repository digests in the VM's private compose configuration.
- Components: Postgres, Auth, PostgREST, Realtime, Storage, imgproxy, Envoy, Edge Runtime, Next.js, Caddy.
- Only loopback ports 18000 (same-origin app/API router) and 18001 (API gateway) are published. Postgres is not publicly published.
- The tunnel connects only to the loopback app/API router. SSH, Tailscale, Remote Desktop Commander and the existing backup channel are retained.
- Public signup, anonymous signup and phone signup are disabled.
- The background worker is restricted to synthetic room e3; other fixture rooms are excluded.
- JWT verification stays enabled for user-facing functions. Only the HMAC-authenticated worker is exempted from the gateway's generic JWT check, matching the original worker's own authentication model.
- Only the required app functions are added. The invitation bootstrap function is not deployed on this public pilot.

## Runtime defects found and fixed

1. `agent_claim_scoped_outbox` read legacy `request.jwt.claim.role`, which PostgREST v14 does not set with legacy GUC support disabled. The actual service-role request returned 42501. Additive migration `20261030000629_source_rating_modern_claim_role.sql` uses the verified JSON claims instead, preserving the service-role EXECUTE grant and room scope. Regression coverage rejects modern anonymous claims even if the legacy GUC says service_role.
2. The manual analysis prompt specified top-level keys without nested object contracts. An actual DeepSeek diagnostic returned `from/to` and `action/owner`, which the strict Zod schema rejected. The manual API now uses the same complete prompt and evidence-validating normalizer as the worker.
3. Signed file URLs retained internal port 8000 after replacing their host with the external HTTPS hostname. The file gateway now explicitly sets the target port, including clearing it for default HTTPS.

These fixes are in the existing draft PR #3. No production merge or promotion was performed.

## Verified evidence

- 27 schema migrations applied to this new isolated database.
- Two intended test accounts signed in using real Auth. The RLS control suite also created an isolated outsider fixture.
- Supplier sees authorized shared rooms and cannot see the buyer-internal room.
- Three persisted English/Chinese/Thai business messages produced real DeepSeek drafts and assigned Needs You items.
- Invalid worker secret rejected with 401.
- Wrong-company approval rejected with 403/42501.
- Buyer approval created a Canonical object; repeated approval was idempotent; a fresh login read exactly one object for that proposal.
- Public same-origin authenticated manual analysis returned `deepseek-direct`; anonymous and wrong-room analysis were rejected before generation.
- PostgreSQL cron and pg_net automatically invoked the worker. A new public message became a real DeepSeek proposal after 59.78 seconds, including the wait for the minute scheduler.
- File verification computed server-side SHA256. The signed public HTTPS download returned the expected exact bytes.
- Ordinary chat persisted while the background worker was stopped.
- Message and approved Canonical record survived a database-container restart and a new login. PostgREST briefly reconnects during database restart; readiness is checked before readback.
- Public project-room HTTP 200 confirmed from the GCP VM and independently from the owner's Windows machine.
- 27 deterministic AI tests, TypeScript, Next production build and the embedded PostgreSQL authorization regression passed after the relevant code changes.
- All public-schema tables inspected had RLS enabled. A scan of 16 browser JS assets found none of the actual service-role, JWT-signing, Postgres or DeepSeek secret values.

Provider diagnostic (one call only): model returned `deepseek-flash`, 207 prompt tokens, 642 completion tokens, 849 total tokens, 4.03 seconds. The worker does not yet persist per-call token usage; this is not a total billing receipt. The three-language worker batch took 14.062 seconds.

Evidence on the VM is under `~/sourcerating-pilot/`: `api-acceptance.json` (12 passed), `public-acceptance.json` (5 passed), `resilience-acceptance.json` (6 passed), build/regression logs, migration list and image digest inventory. Reports contain no provider or service secrets.

## Backup and operating limits

- Owner-only PostgreSQL custom-format backup: 568305 bytes, SHA256 `938bb1a72366698ff4dd8a39954f42f5423dfa1194eb9cfd0da180bc65af4c3b`.
- The archive directory was successfully parsed with pg_restore. A full backup-to-new-instance restore drill has not been performed.
- VM runtime/env files and the private test-password file must stay outside GitHub and shared reports.
- Temporary sudo permission was scoped to this deployment and the original Remote Desktop Commander command restrictions were restored.
- Cloudflare Quick Tunnel has no uptime guarantee. Its hostname can change when its process restarts; the app's compiled public origin and Auth/file origins must then be updated and rebuilt. The current tunnel is a transient systemd unit, not a permanent production ingress.
- A stable named tunnel could not be configured: an initial whole-account inventory read was rejected by automatic approval review as too broad; an exact pilot-only query was then attempted and the connector reported missing Cloudflare Tunnel scope. No DNS records were changed.
- Current cloud browser returned a plain request-blocked page for the temporary domain. Actual browser hydration, mobile layout and physical iPhone/Android flows are NOT accepted by the HTTP/API tests.
- Invitations and SMTP recovery are not enabled. Use the privately delivered existing test accounts.
- Independent technical review, real-phone acceptance, stable ingress, a full restore drill and production sizing remain release gates.

For rollback, stop only this pilot compose project and its HTTPS tunnel; preserve its volumes and owner-only backups. Existing business resources require no rollback because they were not changed.
