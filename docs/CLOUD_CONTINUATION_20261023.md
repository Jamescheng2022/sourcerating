# Cloud continuation — 2026-10-23

Base: `db2b18bfe26aa09e888fe840605b62cc3b809917`, from `l1/stage2-continuation`, on `codex/cloud-launch-20261023`. Checkout: `/workspace/sourcerating`. This is the project-room app, not the older main-branch supplier-rating prototype. Existing Supabase migrations, signed invitation relay, native app and target guards are preserved. No production data, hosted deployment, payment or paid AI operation is authorized by this change.

Changes:

- Frozen `npm ci` already passes on the correct branch; do not regenerate its lockfile based on the old main-branch failure.
- System fonts remove the Google Fonts build dependency. CommonJS acceptance runners retain CommonJS lint configuration; application payloads now have explicit types instead of explicit `any`. User-facing payload text is restricted to strings.
- Real acceptance runners accept Linux CLI, browser, password-file and workdir overrides and retain the local-only API target assertion. Existing account/tenant/side-effect assertions are preserved.
- The retained game example had invalid UTF-8 and unterminated strings. It is now UTF-8 and uses Pydantic v2 copies/validated stats. Three real HTTP tests cover borrowing, repeated valid turns, independent defaults and invalid-state rejection. It remains an unauthenticated stateless simulation, separate from the business backend.
- A new `export_room_evidence` security-invoker RPC exports a single statement snapshot under caller RLS. Anonymous and removed/nonmember callers are denied. The download includes room messages, file metadata, proposals, canonical objects and Needs You history. It intentionally excludes file bytes and credential-bearing signed URLs. Desktop/mobile UI and error status describe it as an evidence **index**, not a complete project archive.

The additive migration has no destructive operation. Rollback: remove the export UI and drop `public.export_room_evidence(uuid)`; no original table/data rollback is needed. Apply only to the isolated synthetic local stack during development.

Environment work uses Node 24.19, Python 3.12, Chromium, Deno 2.9.6 and Supabase CLI 2.75. The original CLI configuration is retained. A compatibility copy outside Git under `/workspace/sr-stack` maps `local_smtp` to `inbucket` and omits newer `orioledb_version`/`experimental.pgdelta` keys for that CLI. Migrations/functions remain sourced from this checkout. Remote production guards remain active.

The cloud Docker daemon uses `vfs` on a 32 GB disk. Standard Supabase Postgres image extraction exhausted the disk before startup. The workaround exports the official linux/amd64 root filesystem and imports it as one layer, preserving upstream Env, Entrypoint, Cmd, WorkingDir, StopSignal and Healthcheck. Upstream platform digest `sha256:e4c5a3f62fed239ca9cd633b5a8e03385f636a9705cc759af0abf56de280b747` passed full `crane validate`; TLS and checksum validation remained enabled. The imported local image is a derived image, not the original image ID. Tool binaries were downloaded through the configured proxy and release checksums verified. Commands and logs are outside Git under `/workspace/tools` and `/workspace/setup-results`.

Launch gaps remain: hosted auth/provider authorization, live AI/source acceptance, a complete project archive including file bytes, account/project deletion and retention policy, production backup/restore, and the rest of the CLOUD_LAUNCH business criteria. Evidence-index export alone does not establish launch readiness. No external preview URL is created by this task.

## Executed checks and remaining gate

| Check | Result |
| --- | --- |
| `npm ci`, `npm run build`, `npx tsc --noEmit --incremental false`, `npm run lint` | PASS; lint has zero errors/warnings; build fetches no fonts |
| Deno invitation/relay/file rules and seed-target guards | 48 PASS |
| Retained example API over real HTTP | 3 PASS |
| New evidence-index UI/RLS export suite | 6 PASS, including removed-member denial and 390px download |
| Existing inquiries suite | 22 PASS, including two submitters, RPC/RLS denials, concurrent idempotency, refresh/restart and mobile |
| Extracted existing Auth recovery suite | 8 PASS, including real local Mailpit recovery, password change, old-password denial, missing-link handling and server minimum |
| Existing complete business E2E | 4 PASS then invitation step FAIL; later steps unrun |
| Existing UI suite | 22 PASS then file byte-check step FAIL; later steps unrun |
| Existing B8 review | 24 PASS then invitation-denial step FAIL; later steps unrun |

The existing recovery assertions were factored into `s2-recovery-review.cjs` and remain called by the original full review. A standalone `recovery` mode seeds its own synthetic account so the independent Auth checks can complete despite the invitation outage. No test assertion was deleted or weakened. Failed invite HTTP diagnostics log only status and an allowlisted error code, never tokens/URLs/passwords.

The full local core stack is now running on the flattened Postgres image, with all repository migrations including the new export applied. Standard Edge Runtime boot also failed because its main-service downloads `deno.land` modules without container DNS. The official CLI v2.75 main-service was bundled with pinned std 0.224.0, jose 4.13.1 and Supabase SDK 2.57.4 dependencies outside Git. Original JWT settings and request handling are preserved. This is a development-only dependency-loading adaptation, not a hosted deployment artifact.

A remaining environment access restriction is reproducible: the local Edge Function's nonce RPC returns `Domain forbidden` for backend `http://kong:8000`, while the same service-role nonce RPC succeeds from the host and another local container reaches Kong. The invitation UI correctly reports `relay_unavailable`; file verification likewise cannot complete. Do not reinterpret these failures as passing business flows or remove authorization checks to work around them. The added `kong` network requirement and refreshed install/start instructions were saved to the environment draft; saving does not apply/publish or prove resolution. Retry after supported settings propagation. No new credential is needed for these local checks.

Evidence: `/workspace/setup-results/sr-*-suite.log`, per-mode `sr-*/` JSON reports, screenshots, `sr-final-build.log`, `sr-final-deno.log`, and `sr-api-final.log`. Sensitive synthetic CLI status and password files stay outside Git and must not be dumped into reports. All completed browser reports record zero outbound requests and zero uncaught page errors. No user-facing external preview is available from this client; local servers are usable only for internal validation.
