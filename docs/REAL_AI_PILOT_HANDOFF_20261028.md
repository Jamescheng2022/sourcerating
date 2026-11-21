# SourceRating real AI pilot — engineering handoff (2026-10-28)

## Scope and hard limits

**Status: CODE READY FOR INDEPENDENT REVIEW; HOSTED REAL-AI ACCEPTANCE BLOCKED.** This branch is not approved for production, live customer onboarding, or marketing claims of AI functionality.

This continues the existing **chat-first** SourceRating app. It does not replace the original project, reimplement Slack, launch a marketplace, or change `sourcerating.com`.

- Repository: `Jamescheng2022/sourcerating`
- APP root: `apps/web`
- Feature branch: `pilot/real-ai-acceptance-20261028`
- Review base: `codex/cloud-launch-20261023`
- Existing Vercel APP project: team `jamescheng2022s-projects`, project `sourcerating`, ID `prj_Ra2cBP9kmKANgMm5xIFEXlV2c5IS`, root `apps/web`
- Intended isolated Supabase project: `sourcerating-stage2`, ref `fzrberkeoizarduwuisp` in Singapore. **INACTIVE at last read.**
- Do not use `sourcerating-p1` (`qnozpurjtgkmwtvsrjoi`) as the substitute; the APP explicitly excludes it as a pilot backend. Do not touch `lushupai-dev` or `sourcerating-website`.

The existing Supabase Free organization has two active projects. A real attempt to restore `sourcerating-stage2` was **rejected by the provider** because the 2-project limit is reached. No project was paused or purchased. Restoring this project requires an explicit owner resource decision (pause a project that the owner chooses, upgrade after checking price, or furnish an approved isolated backend). Do not silently do any of those.

A Vercel read of the APP project's Preview environment variables returned **403 Forbidden**, and recent real-APP builds had failed because public Supabase Preview URL/key were absent. No keys were copied, inferred, or exposed. This means real hosted login/DeepSeek/DB tests are still **BLOCKED**, not PASS.

## Implemented changes (this branch)

1. `supabase/functions/_shared/business-intent.mjs`: multilingual EN/ZH/TH deterministic classification with cheap smalltalk bypass.
2. `apps/web/src/lib/ai/runtime.ts`: authenticated nonwriting analysis API now shares that classification. The APP endpoint already resolves persisted source `eventId` and RLS-checked room before calling a provider.
3. `supabase/functions/_shared/agent-staging.mjs`: same-room bounded historical context, deterministic evidence validation, normalized draft output and review-target assignment.
4. `supabase/functions/source-rating-agent-worker/index.ts`: real durable outbox consumer. It only handles explicitly allowlisted **synthetic** room IDs in the isolated project; accepts signed secret, validates it server-side, and uses a database-scoped claim RPC. For business messages, it optionally calls direct DeepSeek (`deepseek-flash` by default; actual API model is configurable). Malformed results cannot directly become project state. Unavailable model falls back to visibly labeled rules-only draft.
5. `supabase/migrations/202610280001_scoped_ai_pilot.sql`: additive pilot-scoped claim RPC, uniqueness guards for event proposals and linked assigned tasks, stricter authorized human review. A repeat of an already-completed authorized review returns an idempotent readback, not a second Canonical object.
6. `supabase/config.toml`: explicitly sets `verify_jwt=false` **only for the internal signed agent worker** so the non-JWT scheduler can reach it. Its own HMAC validation and isolated-project guard remain mandatory. Existing user-facing JWT and invited-user policies remain unchanged.
7. `supabase/functions/_shared/invite-relay.ts`: pins the **one exact current feature branch** `pilot/real-ai-acceptance-20261028` for this preview; preserves fixed project, exact Host/Origin checks, HMAC signing and global signup-disabled policy. **Before any later merge/deploy of a different branch, update this one literal to the exact approved target branch and rerun guard acceptance. No wildcard or fallback.**

### Safety model

- Chat persists independently of AI; model failure must not prevent ordinary messages.
- Only a service process with the correct HMAC secret, explicit isolated tenant approval and strict room IDs can claim work.
- This background process never writes Canonical objects and never sends buyer/supplier emails.
- Same-room context is strictly event-ID and sequence bounded. Prompted model must quote supplied evidence; parsed results are drafts.
- The receiving company is assigned a Needs You; *only an eligible member of that company* may review/accept into Canonical, via the original transactional DB RPC. Missing task assignment denies.
- No service-role, HMAC or DeepSeek key may be put in the browser, GitHub, static bundles or test reports.

## What was actually tested

From repo root with Node 22+ and Deno 2.5.3+:

```bash
cd apps/web
npm ci
npm run lint
npx tsc --noEmit --incremental false
npm run test:ai:pilot
# No backend is contacted by the next build. Its local-only key is test data,
# NOT a valid credential. Never use these placeholders in Vercel Preview.
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_synthetic_unit_test npm run build
cd ../..
npx deno@2.5.3 lint supabase/functions/source-rating-agent-worker/index.ts \
  supabase/functions/_shared/agent-staging.mjs \
  supabase/functions/_shared/business-intent.mjs
npx deno@2.5.3 check supabase/functions/source-rating-agent-worker/index.ts
```

Observed: Node test runner **27/27 PASS** (scripted simulated roles, multilingual canaries, evidence and invitation guards); ESLint and TypeScript **PASS**; Next local build **PASS**; Deno lint and type checking **PASS**.

An additional ephemeral, single-connection PostgreSQL 18 WASM test actually executes the new migration and tests: anonymous outbox claim denial; scoped room claim; untouched other-room outbox; one proposal per source event; wrong-org / unassigned review denial; authorized human accept; repeat accept gives one Canonical entry. **All checks PASS.** Reproduce without Docker:

```bash
npm install --no-audit --no-fund --prefix /tmp/sr-pglite-qa-20261028 --save-exact @electric-sql/pglite@0.5.12
SR_PGLITE_PKG=/tmp/sr-pglite-qa-20261028/node_modules/@electric-sql/pglite \
  node apps/web/scripts/pglite-authorization-smoke.cjs
```

This is a **local synthetic database**, with minimal mock Auth/RLS schema, not the actual hosted Supabase SQL migrations running against real Auth/Storage/Reatime or true multi-user integration.

## Remaining explicit release gates

**1. Hosted isolated backend.** Owner resolves Supabase Free active-project capacity or supplies another explicitly approved isolated HTTPS backend. On the chosen environment, inventory existing tables/migrations and backups/rollback first; review new migration and its uniqueness constraints against existing rows, then apply only to synthetic tenant. Never delete conflicting rows automatically.

**2. Preview configuration access.** Existing Vercel APP project only; set `NEXT_PUBLIC_SUPABASE_URL` and exactly one matching **public** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Preview, including branch scope. The Vercel connector's prior env-list request was denied 403; an authorized owner needs to complete these settings. Rebuild after settings, because `NEXT_PUBLIC_*` values are compiled into browser assets. Do not bypass the build-time config guard.

**3. Signed invite and backend runtime.** Keep global `enable_signup=false`. Configure an approved existing isolated relay secret server-side (`SR_INVITE_RELAY_SECRET`), `SR_INVITE_RELAY_PROJECT_REF=fzrberkeoizarduwuisp` for the current intended project, and exact callback/Preview origin. Verify the Edge HMAC/nonce contract and valid `VERCEL_ENV=preview`, current exact branch and actual Host/Origin; do not weaken them. Require explicit approval for synthetic invite emails and two test identities.

**4. Real DeepSeek test.** Configure `SOURCERATING_DEEPSEEK_API_KEY` **server-only**, in the isolated worker (and APP Preview if testing the nonwriting API). Set `SOURCERATING_LLM_PROVIDER=deepseek-direct`, a valid current model, `SOURCERATING_PILOT_TENANT_CONFIRMED=YES_ISOLATED_SYNTHETIC_TENANT`, and `SOURCERATING_PILOT_ROOM_IDS` to synthetic UUIDs only. Verify service key and HMAC remain server-only. Deploy worker to *isolated Stage2 only*. Set private scheduler's `worker_url` only after request authentication checks and owner permission; absent worker URL keeps scheduling disabled. Limit first true model test batch to **10–25 calls**, report actual model, JSON validity, multilingual precision, measured latency, token spend, and whether proposal persisted. No fake "real AI" success reporting.

**5. Live end-to-end acceptance.** Two real invited synthetic test accounts, buyer/supplier internal/shared room isolation, login/recovery, message retry/relogin ordering, file verification and download bytes, separate-company Needs You, authorized accepted/dismissed Canonical and audit evidence after browser closes, negative cross-tenant and replay checks; test normal chat when AI is down. Prior `apps/web/scripts/s2-web-e2e.cjs` and earlier 89-scenario blind QA remain the test bases; scripted Agent roles alone are not user validation. Test actual iPhone + Android after server success.

**6. Security / release.** Independent technical review of this draft PR, full hosted RLS and service-role threat model, actual file contents export/retention scope, backup/rollback and no customer data in test rooms. Keep all production aliases, customer DB and website unchanged. The current preview branch pin is **not** safe to merge unchanged into a different production branch. Production release and partner demo marked HOLD until evidence of real functionality exists.

## Expected delivery receipt when real acceptance is complete

Provide verified user-openable mobile HTTPS Preview URL; Vercel deployment ID, branch and SHA; matching Supabase test project ref, schema version; AI provider success/failure logs without secrets, full 2-user E2E evidence, security failures fixed, prior tested rollback artifact and remaining known risks. Do not call a READY build or an interactive UI mock a production-ready application.
