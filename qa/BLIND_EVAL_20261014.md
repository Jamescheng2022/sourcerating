# SourceRating · AI-native blinded QA lane

**Baseline:** `l1/stage2-continuation`, commit `95ccfe4c243b7d6f73844c4f981fecdc3d876b98`. This is a test-only branch. **Never merge main, deploy production, disable preview security, or run against real customer records.**

## Scope

The product is a natural, fast Messenger with invisible AI: chat first, derived business drafts only when useful, authorized human confirmation, strong company/private room boundaries, and source-linked business memory.

Independent browser-based design reviews (NOT actual app E2E tests):
- Construction role: 12 cases — `973437fb-a8cd-423a-b6ef-9ffbf34c8475`
- Security red team: 12 cases — `5203ea01-3c5e-4877-9b47-794d937c9cb0`
- Everyday chat/Thai SME UX: 10 cases — `23ad88a9-c542-4b67-9a19-51bc6e93a31d` (older apps/room mock — do not apply findings blindly to current apps/web)

Run `node qa/static-gates.mjs`: read-only heuristic checks on this repo, **not proof of runtime PASS**.

### Evidence from first audit

Stage2 database read-only snapshot: 5 persisted message events; 5 outbox rows pending; 0 staging proposals; 0 Needs You; 0 canonical objects. The deployed edge function list did not include a live Agent Worker. External anonymous browser opening the staging preview met Vercel's authentication wall (run `df349c98-cc57-4e5e-8e71-cc40de265634`); this is an **access-test BLOCKED**, not a messenger functional failure.

Current `apps/web/src/lib/staging.ts` sends `recentContext: []`, the analysis API takes caller-submitted message text and returns an analysis without persisting a proposal on that request path, and the English-oriented rules fallback can miss Chinese/Thai business terms. Each needs a real test and correction before a user pilot.

### Required real tests

1. New external buyer/supplier join + spontaneous chat and seamless mobile use.
2. Real model understands multi-turn price/version/delivery changes in Thai, Chinese, English; ties every fact to authorized persisted original messages/files.
3. Persistent, idempotent Event/Outbox worker creates **Draft** Staging and Needs You even with clients closed.
4. Authorized human fixes/approves; exactly one Canonical object, audited source, no unilateral self-approval.
5. Private company margins never shared with outside organization; invite expiry, file version, replay, prompt injection, invalid payload tests.
6. AI failure does not slow/hijack chat; normal smalltalk causes zero unsolicited business cards in canary.
7. Repeat by role (buyer/supplier/designer/PM/accountant/retailer); final gate includes actual iPhone/Android and human users.

Existing `apps/web/scripts/s2-web-e2e.cjs` uses Playwright + local Supabase with provider keys intentionally scrubbed. This is a **messaging test**; run live LLM on authorized isolated stage separately.

Full detailed Chinese execution plan, 89 synthetic cross-industry cases, separate blinded prompts, non-writing analysis probe and first audit receipts are saved to the user's Library as `SourceRating_AI_Blind_Eval_2026-10-14.zip`. Any future independent Claude/Antigravity work must use the existing approved sealed review bridge. Do not use personal credentials or copy app secrets.

**Release gate: HOLD.** Do not claim real AI E2E, security or usability passes before runtime evidence.