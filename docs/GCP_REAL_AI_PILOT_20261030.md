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
- VM: 2 vCPU, approximately 8 GB RAM, 30 GB disk; approximately 16 GB available after the initial deployment; approximately 12 GB available after UI QA tools and rollback build were added. This deliberately reduced test stack is below the full-stack documented 40 GB disk minimum and is not sized for production.
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
- The original cloud browser returned a request-blocked page. Subsequent Chromium 145 browser tests from the GCP QA container successfully loaded and hydrated the public HTTPS app, signed in both accounts, sent messages, ran real DeepSeek checks, and exercised 390px/768px responsive drawers. These are browser/emulation results; physical iPhone/Android keyboard and touch acceptance still remain.
- Invitations and SMTP recovery are not enabled. Use the privately delivered existing test accounts.
- Independent technical review, real-phone acceptance, stable ingress, a full restore drill and production sizing remain release gates.

For rollback, stop only this pilot compose project and its HTTPS tunnel; preserve its volumes and owner-only backups. Existing business resources require no rollback because they were not changed.

## Three-column workspace update — 2026-10-30

The owner's mobile screenshots exposed a navigation/layout problem in the real app. This update changes the existing `apps/web` shell and preserves its Auth, RLS, event persistence, file gateway and human-review RPCs.

- Desktop: workspace/room navigation, central group conversation, AI summary/milestones. Both sidebars collapse independently and remember that browser's preference.
- Collapsed navigation: colored room tiles, selected-room marker and counts for new activity received during the current session. These are not invented online-presence or durable unread indicators.
- At widths below 1100px, navigation and AI context open as modal drawers over the chat. Room selection no longer needs a horizontally overflowing row.
- Existing live pilot room is the initial selection when authorized. Fixture rooms remain available; no test data was deleted.
- Real group messages use sender avatars, dates, incoming/outgoing bubbles, send acknowledgement, current-room search and the existing attachment/IME-safe composer.
- Right sidebar derives summaries and milestone counts from persisted AI proposals, Needs You and accepted Canonical objects, refreshing every three seconds. Pending AI drafts remain labeled; a confirmed object never establishes completion of delivery or other external milestones.
- AI availability distinguishes configuration, a successful analysis, a message that needs no deep analysis and a failed request. No analysis on ordinary small talk is no longer presented as a provider failure.

### Open-source reuse

| Resource | Pinned version | License | Actual integration |
| --- | --- | --- | --- |
| [Chatscope React Chat UI Kit](https://github.com/chatscope/chat-ui-kit-react) | 2.1.1 | MIT | Message/custom-content rendering and date separators; existing event/RLS adapter retained |
| Chatscope styles | 1.4.0 | MIT | Chat component stylesheet with scoped product styles |
| [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog) | 1.3.1 | MIT | Modal navigation/context drawers and AI settings |
| [Lucide React](https://github.com/lucide-icons/lucide) | 1.64.0 | ISC | Consistent application icons |

The inspected previous package manifest did not contain a mature chat UI library. This change adds actual component reuse instead of claiming the previous custom JSX already did so. Chatscope's published peer dependencies explicitly accept React 19. The whole app/backend was not replaced.

### DeepSeek configuration contract

Existing service-side variables remain the integration boundary:

```dotenv
SOURCERATING_LLM_PROVIDER=deepseek-direct
SOURCERATING_DEEPSEEK_API_KEY=<server-only-secret>
SOURCERATING_DEEPSEEK_ENDPOINT=https://api.deepseek.com/chat/completions
SOURCERATING_DEEPSEEK_MODEL=deepseek-flash
SOURCERATING_PILOT_ROOM_IDS=<isolated-room-allowlist>
```

Apply matching provider configuration to the app and background worker, then recreate the relevant service. The pilot room allowlist was copied to the app's private runtime env so its status display agrees with the worker's configured scope.

The new `GET /api/project-room/ai-status?roomId=<uuid>` verifies the caller and room under RLS and returns exactly `configured`, `provider`, `model`, `scope`. It never returns keys, key prefixes or service credentials. The settings dialog displays masked status and runs a real authenticated, persisted-event-bound check through the existing `POST /api/project-room/analyze`; that check does not write Canonical state.

Key replacement remains an administrator operation on the server. There is deliberately no misleading browser Save button or global secret-write permission for ordinary room members. Per-workspace credential editing would require a separately designed administrator permission and encrypted credential store.

### Additional acceptance actually completed

- 10 Chromium/public-HTTPS checks passed: real buyer login, three columns, collapsed room switching, AI folding, configured DeepSeek plus real generation, send/reload persistence, message search, second-account group receipt and private-room exclusion, responsive drawers/no horizontal overflow at 390px and 768px, zero unhandled browser exceptions.
- Four live review steps passed: supplier browser message reaches buyer, minute worker produces a real Needs You proposal, buyer accepts it in the right sidebar and confirmed count increases, confirmed record survives browser reload.
- Four new status-API controls passed: anonymous 401, malformed room 400, supplier/private-room 403, allowed member receives only the four approved metadata fields.
- Targeted ESLint passed with no warnings, TypeScript passed, production Next build passed, all 27 deterministic AI regression tests passed.
- Final scan of 16 browser JS assets found zero matches for the actual DeepSeek, service-role, JWT signing or Postgres secrets.
- Public project-room returned HTTP 200 after the final app restart.

Browser test source is in `apps/web/scripts/workspace-acceptance.cjs` and `workspace-review-acceptance.cjs`, using pinned Playwright 1.58.2. Run only against the existing synthetic pilot fixtures, never a production workspace. Provide `PILOT_URL`, `SR_TEST_CREDENTIALS` pointing to the owner's private JSON password file (buyer/supplier string values), and optionally `SR_QA_OUTPUT`. Use `npm run test:workspace:browser` and `npm run test:workspace:review`. The review script requires the prior accepted pilot Canonical fixture and creates/accepts synthetic commercial proposals. It performs real model calls.

GCP receipts: `ui-qa/workspace-acceptance.json`, `ui-qa/workspace-review-acceptance.json`, `ui-qa/ai-status-acceptance.json`; desktop, mobile, AI drawer and settings screenshots; `ui-build.log`, `ui-eslint.log`, `ui-tsc.log`, `ui-ai-regression.log`. The QA browser image is pinned to `mcr.microsoft.com/playwright@sha256:6446946a1d9fd62d9ae501312a2d76a43ee688542b21622056a372959b65d63d`.

The trial URL and private accounts are unchanged. No production promotion, infrastructure purchase, other-project pause, or production-data migration was performed. The temporary-domain, physical-phone, restore-drill and independent-review gates above still apply.
