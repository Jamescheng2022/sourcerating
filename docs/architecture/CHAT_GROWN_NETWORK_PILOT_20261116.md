# SourceRating｜Chat-grown Company & Relationship Network Pilot

**Date:** 2026-11-16  
**Branch:** `feat/room-to-marketplace-profiles-20261116`  
**Base:** `6274559ed37b10c8f1bdb1c85059196f65d3388b` (`fix/project-room-file-lineage-20261114`)  
**Status:** CODE ONLY / NOT DEPLOYED / NOT BROWSER VERIFIED

## Why this is an extension of Room B, not a competing CRM

The authoritative `SourceRating_Master_PDR_v3.1_Chat_First_Claude_Review_2026-11-13` establishes:

1. Chat First: no mandatory RFQ/CRM onboarding, and no modification of the proven Project Room flow.
2. Person and Organization are independent identities. A company can be a buyer in one project and a supplier in another.
3. Private Raw Evidence -> revisable Derived Intelligence -> explicitly confirmed Canonical Business State.
4. Each organization keeps **its own** collaboration memory; the other organization's quotes, drawings and private chats do not become a shared supplier directory.
5. Existing external CRM/ERP remain the authority when connected. This pilot is a private relationship memory, **not** an attempt to replace CRM or build a public marketplace before real demand.

## Implemented in this branch

### 1. Database foundation (NOT applied anywhere)

`supabase/migrations/202611160001_chatgrown_network_foundation.sql`

- `sr_organization_profiles`: company directory profile, keyed to existing `organizations.id`. Private by default; public publication has separate human approval fields. No automatic publication.
- `sr_person_profiles`: user-owned personal profile, independent of active organization; private by default.
- `sr_organization_relationships`: **directional, company-private** buyer/supplier/partner contacts with pipeline stage and notes. An organization admin owns these, NOT its counterparty or SourceRating globally.
- `sr_profile_suggestions`: untrusted AI-derived candidate facts, reviewed per field, with source kind, confidence and owner scope. No automatic write into Canonical state.
- RLS grants for member/admin/owner, anonymous public-read only after explicit publication, and immutable-identity triggers to prevent moving private records across companies.
- No backfill, no reading historical chats, no project modifications, no automatic account merging, no synchronization with outside SaaS.

### 2. Opt-in AI extractor — only user-provided text

`apps/web/src/app/api/project-room-b/profile-suggest/route.ts`

- Requires signed-in user JWT, validates organization admin/owner membership.
- Accepts up to 12,000 characters explicitly pasted from a company brochure or company website.
- Returns unverified candidate `description`, `website_url`, `country`, `capabilities`, with confidence and a short evidence note.
- Does NOT fetch arbitrary links (avoid SSRF), download PDFs, read private Room history, save suggestions, contact anybody, or publish profiles.
- Model may be DeepSeek or the existing OpenCode Go gateway. Its output is untrusted; users review every field.

### 3. Pilot page

`apps/web/src/app/project-room-b/network/page.tsx`

- Private company profile editor; manual save always leaves profile private.
- Personal profile editor with user-only ownership.
- Optional AI suggestions: input -> generate (no write) -> save pending suggestion -> explicit confirm/dismiss -> update private profile.
- Simple company-owned buyer/supplier relationship directory: create relationship, update contact stage.
- From a shared Room, a guarded deep-link may prefill the counterparty: it checks the requesting user's active Room membership and organization identity before using that name.
- No automatic CRM creation from private messages.
- Fails gracefully when migration is not present.

`apps/web/src/app/project-room-b/real-ui.tsx`: sidebar link is hidden unless `NEXT_PUBLIC_SR_NETWORK_PILOT=1` is explicitly enabled. Existing Lab stays unchanged.

### 4. Preflight static checks

`apps/web/scripts/network-feature-contract.test.cjs` uses Node's built-in test runner. These sanity checks are **not** a substitute for Postgres RLS tests, TypeScript build or real browser acceptance.

## Rollout gates (do not skip)

**G0 CODE:** Review and freeze original Room B SHA, inspect this isolated feature branch. No main merge.

**G1 DATABASE:** Use an ephemeral/local disposable Supabase database, not live `nunojlfangvnjlwggvvb`. Run `supabase migration new`/migration workflow using installed CLI version and follow `supabase --help`; review SQL before applying. The migration file was added through GitHub because the current chat container has no Supabase CLI and npm registry resolution is unavailable. Resolve migration ordering with the project's actual migration history.

**G2 BACKEND:** Verify each new table exists and has RLS enabled. Test with four separate users in two orgs:
- Org A admin can read/write A profile, A private relationships, A suggestions.
- Org B admin cannot read A's private relationships, raw AI suggestions or unpublished profile.
- Org A ordinary member cannot read A's admin-only private CRM notes.
- Removed org member loses access immediately.
- User can edit their own person profile, not others'.
- Authenticated third parties and anonymous users cannot read private profiles; publicly approved profiles are visible as explicitly configured.
- Admin of two organizations cannot reassign A's relationship to B.
- Rejected candidate cannot be silently reactivated or rewritten.
- `src/org_room` privilege check cannot be bypassed with forged URL params.

**G3 AI:** Send an explicitly submitted synthetic brochure passage to the AI endpoint. Inspect candidate suggestions. Confirm no DB writes before "save as pending"; no public visibility even after "accept". Test that malicious prompt injection inside the brochure is ignored. Verify all LLM calls occur only after admin authorization. Test timeouts, invalid JSON and rate-limit behavior.

**G4 UI:** Use Playwright/AGY with independent browser contexts: ordinary member, Org A admin, Org B admin, revoked admin. On mobile 390 and desktop 1440, open the page, edit a draft, add one supplier, add one buyer, change status, use a guarded Room deep-link, and refresh. Ensure no navigation or chat regression.

**G5 BASELINE:** Existing Room B multi-user + offline + RLS + file version tests must remain PASS. The feature flag is still off by default; no impact on the Lab baseline.

**G6 PILOT:** Only after the above pass: preview-deploy this branch to a separate test URL with a disposable DB. Then (if approved) enable `NEXT_PUBLIC_SR_NETWORK_PILOT=1`. Do not repoint the current Lab alias, modify production, or publish Marketplace profiles in this pilot.

## Follow-on iterations (NOT implemented)

- Consent-gated website retrieval using a protected fetch worker with DNS/IP/redirect/size restrictions, plus per-source traceability.
- Brochure PDF parsing with permissioned file-read and page/section citations.
- **Authorized Room -> suggestion**: opt-in per organization and per Room; only the contributing organization's permitted statements, with true EvidenceRef and source-room permission checks. Never silently aggregate counterparty's private statements.
- Low-interruption profile questions through `Needs You` or a small personal notification card; ignore/dismiss/snooze.
- Confirmable Entity Match & Link: no automatic merging of similar company names/domains.
- User-controlled public company/product page, enterprise admin approval, audit trail, right to revoke, and independently confirmed certifications.
- Saved project-specific relationships, follow-up reminders, RFQ capture and external CRM connector sync where authorized.
- Public supplier search and buyer/supplier matchmaking **only** from verified, authorized public fields; no access to private contacts, chats or commercial terms.

## Outstanding risks / must disclose

- No live DB migration, AI call or browser build/test has been executed for this branch.
- Acceptance of an AI suggestion currently uses two client writes (private profile upsert, then suggestion status update), not one atomic server-side transaction. A failure between them must be surfaced; before launch implement a transactional RPC with invoker permissions and full audit.
- Per-field suggestion sources have a short user-entered label, not yet a canonical EvidenceRef with access-controlled page/line location.
- Published profile lifecycle (withdrawal, audit, discoverability) is modeled but not exposed in the pilot UI.
- This pilot has basic relationship statuses and notes; **it is not an automated full CRM**.
- Any browser actions, actual schema application, and Beta readiness are pending independent QA. No claim of a working Marketplace or app release.

## Handoff for local AGY/Codex (copy and run in their capable workspace)

Read `docs/architecture/CHAT_GROWN_NETWORK_PILOT_20261116.md` on `feat/room-to-marketplace-profiles-20261116`. Work only on a disposable copy based on this branch, no main/production/Lab modifications. First run static contract tests, full Next/TypeScript build and a fresh disposable database migration; then complete RLS negative tests and the two-company cross-room scenario. Triage and fix functional defects without making the UI a mandatory onboarding step. Add a transactional confirm-suggestion RPC before allowing pilot rollout. Capture browser Trace, schema/RLS checks, AI candidate request/response redacted evidence, and PASS/FAIL/NOT RUN. Return one reviewable QA PR targeting the isolated feature branch. No deployment or public profile publication without Owner review.
