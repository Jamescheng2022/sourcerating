# SourceRating Project Room B — Live Browser Acceptance Handoff
**Date:** 2026-11-14  
**Audience:** Claude / Cloud agent operating the JAMESGEAR local browser  
**Purpose:** Run a real, authenticated browser acceptance of the deployed Project Room B preview, specifically the real DeepSeek AI path and the file gateway/version workflow. This is a test-only task; do not modify application code or production.

---

## 1. Exact target and baseline

**Live test URL**

https://sourcerating-room-lab.vercel.app/project-room-b

**Vercel project:** `sourcerating-room-lab`  
**Latest verified deployment:** `dpl_6nkRW5vSYfDWVU19AeDJf3eQJWSs` — READY  
**Deployed Git branch:** `feature/project-room-b-real-core-20261113`  
**Deployed commit:** `3c8584fc4bd82c33204072cb3e067d52fe68429c`

**Source repository:** https://github.com/Jamescheng2022/sourcerating  
**Implementation branch:** https://github.com/Jamescheng2022/sourcerating/tree/feature/project-room-b-real-core-20261113  
**Baseline acceptance report:** [docs/PROJECT_ROOM_B_REAL_20261114.md](../PROJECT_ROOM_B_REAL_20261114.md)  
**Machine-readable acceptance:** [docs/project-room-b/real-acceptance.json](../project-room-b/real-acceptance.json)

The existing automated report records **32 passed, 0 failed, 2 not run**. The two not-run items are the real provider/model response and a physical-phone soft-keyboard test. The AI authorization and room-isolation tests were previously exercised against a local model stub, not the live DeepSeek model.

### Environment boundary — verify before writing anything

The `sourcerating-room-lab` Vercel project is a separate lab project. Its current backend is the dedicated Supabase staging project `sourcerating-b-staging`, ref `nunojlfangvnjlwggvvb`. The existing production SourceRating project `sourcerating-p1` was not used for this B test environment.

The Vercel target called **Production** in this lab project means the Production target of the *lab Vercel project*; it does not mean the main SourceRating production application. Still, before creating QA data, confirm the page visibly shows **STAGING · 测试环境** and that the domain is exactly the lab URL above. If either check fails, stop and report; do not write data.

The owner has configured these environment variables on the lab Vercel project:
- `SOURCERATING_DEEPSEEK_API_KEY` — secret value; never display, copy, log, screenshot, or include it in a report.
- `SOURCERATING_LLM_PROVIDER=deepseek-direct`.

The current code defaults to model `deepseek-flash` and endpoint `https://api.deepseek.com/chat/completions` unless an explicit model/endpoint variable overrides it. Do not change these settings during this test.

---

## 2. Browser control — free local path, no TinyFish

**Do not use TinyFish or any paid cloud-browser wallet. Do not ask the owner to top up TinyFish.**

Use the following order:

1. **First choice: existing Chrome DevTools MCP on JAMESGEAR.** Discover the currently configured MCP tools and reuse the already-enabled `chrome-devtools` server if present. Do not reinstall an existing server. Use a dedicated Chrome profile/window for SourceRating QA.
   - Official project: https://github.com/ChromeDevTools/chrome-devtools-mcp
   - Basic MCP command if it is genuinely missing and the owner approves installation: `npx -y chrome-devtools-mcp@latest`.
2. **Fallback only if Chrome DevTools MCP is unavailable or cannot attach:** Microsoft Playwright MCP.
   - Official project: https://github.com/microsoft/playwright-mcp
   - Claude Code setup: `claude mcp add playwright npx @playwright/mcp@latest`
   - To attach to an existing authenticated Chrome profile, use the official Playwright browser extension mode (`--extension`) after installing its extension, or the documented CDP connection. Prefer the extension route for an existing logged-in tab.
   - Official connection guide: https://playwright.dev/mcp/configuration/browser-extension
3. Do not install both alternatives just to experiment. Check Node.js/MCP configuration and available tools first. If installation is required, make the smallest change and report it.

The user may need to enter the test account credentials manually in the controlled browser. Never ask for the password in chat, never copy credentials into a prompt, and never export cookies/storage state. Use a separate QA browser profile; do not expose the user's ordinary Chrome tabs, email, banking, or unrelated sessions to browser automation.

---

## 3. Test rules

- This task is **live browser acceptance**, not a code implementation task.
- Do not edit code, create commits, merge branches, change Vercel variables, deploy, run migrations, or modify Supabase policies.
- Do not touch the main SourceRating production domain or `sourcerating-p1`.
- Use only an existing clearly QA-prefixed room/project, or create a new project named `QA LIVE AI <timestamp>` only after verifying the STAGING banner and lab URL.
- Do not invite real people or send email invitations.
- Do not send test messages into a non-QA business room.
- Do not delete QA data. Restore-as-new-version is allowed only for a clearly QA file in a QA room; it must create a new version and must not overwrite an old object.
- Never expose API keys, bearer tokens, cookies, signed URLs, passwords, or full private file contents in screenshots or reports.
- If an unexpected real customer/project record appears, stop using it and choose another QA room.

---

## 4. Test A — confirm the browser session and environment

1. Open the exact URL in Section 1.
2. Confirm the page shows **STAGING · 测试环境**, not a login page and not a DEMO banner.
3. Confirm the signed-in user and active organisation are the intended QA account/organisation.
4. Open a clearly QA-prefixed project/room. If no suitable QA room exists, create `QA LIVE AI <timestamp>` in this staging app only.
5. Capture a screenshot of the page and the room name, with personal email addresses and any private information masked.

If the browser is not authenticated, stop and let the owner log in manually. Do not guess credentials or attempt password recovery.

---

## 5. Test B — real DeepSeek AI (the main outstanding acceptance)

The UI has a right-side panel with tabs **成员 / 文件与确认 / AI**. In the AI tab there are buttons **总结** and, on a main room, **建议拆分**. Individual messages expose **问 AI** and **翻译** actions.

The server route is:

`POST /api/project-room-b/assist`

Supported request modes:
- `summary` — room summary.
- `explain` — explain one message; requires `eventId`.
- `translate` — translate one message; requires `eventId`.
- `split` — suggest sub-rooms.

The route is expected to return `ok: true`, `provider: "deepseek-direct"`, the structured `result`, and `written: false`. AI output is private to the requesting user's panel; it must not silently post a public chat message or create a room. A sub-room suggestion must only create a room after the user explicitly confirms the UI dialog.

### B1. Prepare a controlled QA conversation

Use a QA-only room. If the room lacks useful sample content, send a few clearly synthetic QA messages yourself, for example:

- `QA drawing D-101 rev A lists a 12 mm plate.`
- `QA supplier update: the revised load calculation may require a 14 mm plate.`
- `QA supplier will submit a revised quotation by 18 November 2026.`
- `QA coating system is still not confirmed.`
- `QA Alice will confirm the coating system before the quotation is final.`

These deliberately include a specification conflict, a deadline, an open question, and an action owner. Do not present any of these as real engineering advice or a real commitment.

### B2. Run and verify each AI action

1. Open the QA room → right panel → **AI** → click **总结**.
2. Verify the result contains meaningful structured sections, where supported:
   - summary;
   - decided / 已达成;
   - open questions / 未解决;
   - todos / 待办;
   - contradictions / 矛盾;
   - version notes / 版本变化;
   - follow-up questions / 建议追问.
3. Check whether the model correctly identifies the 12 mm vs 14 mm conflict as unresolved, rather than inventing a final decision. Check that the 18 November deadline and coating-system action are attributed correctly.
4. Click at least one **来源** chip. It must jump to the actual supporting message, not an unrelated message.
5. On one QA message, run **问 AI** / explain. Verify the explanation refers to the selected message and the room context.
6. On one English QA message, run **翻译**. Verify the output is in the browser's requested locale and preserves part numbers, numbers, units, names, and dates.
7. In the main QA room, click **建议拆分**. Verify any suggestions are relevant to distinct work streams. Do not click **创建** during this test; record the suggestion and dismiss/leave it uncreated.
8. Confirm AI output remains private to the requesting user's panel and is not added as a public message or formal confirmation.

### B3. Verify the actual provider request (not just a success toast)

Use DevTools Network/Console or the browser MCP's network tools. Inspect only request metadata and response content needed for acceptance.

For `POST /api/project-room-b/assist`, verify:
- HTTP status is 200.
- Response JSON has `ok: true`.
- `provider` equals `deepseek-direct`.
- `mode` matches the action.
- `result` contains non-empty, substantive content.
- `written` is `false`.
- Request/response completes within a reasonable time; record actual latency.
- No provider key or Authorization header is copied into logs, screenshots, or the report.

The route has a 40-second provider timeout. Expected error interpretation:
- App route 401: missing/expired user session.
- App route 403: user is not a member of the requested room.
- App route 503 with “AI provider is not configured”: Vercel environment variable missing from the active deployment/target.
- App route 502 “AI provider returned 401”: provider key rejected; ask the owner to check it in Vercel, do not request the key.
- 429: provider quota/rate limit or account balance issue; report exact status and time.
- 502 timeout/request failed: investigate provider/network latency without printing credentials.
- HTTP 200 with empty or irrelevant result: treat as AI quality failure, not a pass.

If the response body includes a provider name other than `deepseek-direct`, report it. Do not infer the model from a successful UI toast.

---

## 6. Test C — file gateway, download, compare, restore

The right-side panel tab is **文件与确认**. A file lineage lists versions (v1, v2, etc.). Each version card shows a SHA-256 prefix and verification status. Available actions include **下载**, **对比 vN**, **恢复为新版本**, **上传新版本**, and confirmation controls.

The browser app uses the same-origin relay:
- `POST /api/project-room-b/gateway`
- Supabase Edge Function: `room-file-gateway` (JWT verification enabled).

### C1. Existing QA files first

1. Open a QA-only room with a file lineage containing at least two versions.
2. Confirm each uploaded version reaches **verified** status, not `pending` or `failed`.
3. Click **下载** on an old version. Confirm the browser receives the original file, not an HTML error page.
4. Compute SHA-256 of the downloaded bytes locally and compare with the full SHA-256 recorded for that exact version. Do not publish the file contents.
5. Click **对比 vN**. Confirm the two original files load side by side and the metadata table marks differences in uploader, time, size, SHA-256, description, and confirmations where applicable. This feature is a visual/metadata comparison, not a text-level diff.

### C2. Restore-as-new-version

Only do this if the file lineage and room are clearly QA-only.

1. Record the current version list and existing confirmations.
2. On an older QA version click **恢复为新版本**.
3. Verify a new version is appended (for example, restoring v1 after v1/v2/v3 should create v4).
4. Verify the new version's file bytes/hash match the restored source version.
5. Verify the new version has no inherited confirmations.
6. Verify old versions and their confirmations remain unchanged.
7. Do not overwrite or delete any old version.

If no suitable QA file exists, create two harmless test PDFs locally with distinct visible text and upload them as v1 and v2 to a QA-only room. Never upload confidential or customer files.

---

## 7. Test D — permission and privacy spot checks

Only use a second QA account if one is already available and authorised.

- A non-member must not be able to call the AI route for a room (expected 403 before provider invocation).
- Internal-room and sibling-sub-room content must not appear in the current room's AI result.
- AI output must remain private to the requesting user.
- A user removed from a room must lose access to room messages and file records/downloads.
- A signed file URL must not be treated as permanent; verify expiry/denial only if it can be done without disrupting another user's work.

Do not extract access tokens or manually replay another user's authenticated requests. Use the UI and normal session boundaries.

---

## 8. Evidence and final report format

Save screenshots and a concise report locally first. Do not commit browser state, downloads, cookies, storage-state JSON, credentials, signed URLs, or private customer data to GitHub.

Report every item as **PASS / FAIL / NOT RUN**, with:
- exact test room name (QA only);
- action and observed result;
- HTTP status and latency where applicable;
- provider returned by the live route (never the key);
- whether result content was meaningful;
- file version IDs or short hashes only (no private file contents);
- screenshot/evidence filename;
- reproduction steps for any failure.

Required summary table:

| Test | Status | Evidence / notes |
|---|---|---|
| Authenticated staging session | | |
| Live AI summary via DeepSeek | | |
| AI source chips jump to correct messages | | |
| Single-message explanation | | |
| Translation | | |
| AI sub-room suggestion (no auto-create) | | |
| AI remains private / no public write | | |
| File upload verification | | |
| Old-version download + SHA-256 match | | |
| Side-by-side version comparison | | |
| Restore old version as new version | | |
| Old confirmations preserved / new version unconfirmed | | |
| Permission/privacy spot checks | | |

At the end, state clearly whether the real-model test has passed. A 32/32 automated stub-backed result does not count as a real DeepSeek pass.

If any issue is found, do not patch it in this task. Provide a focused follow-up handoff with exact reproduction steps, route/status, screenshots, and suspected source file. Wait for the owner before making code, database, environment, or deployment changes.

---

## 9. Relevant source files

- AI route: `apps/web/src/app/api/project-room-b/assist/route.ts`
- File relay: `apps/web/src/app/api/project-room-b/gateway/route.ts`
- Main UI: `apps/web/src/app/project-room-b/real-ui.tsx`
- Real backend adapter: `apps/web/src/app/project-room-b/use-real.ts`
- E2E test: `apps/web/scripts/project-room-b-real-e2e.cjs`
- Previous acceptance: `docs/PROJECT_ROOM_B_REAL_20261114.md`
- Machine-readable results: `docs/project-room-b/real-acceptance.json`

**Definition of done:** a live browser session proves that the deployed app calls the configured DeepSeek provider and returns useful, source-grounded private AI results; file upload verification, old-version download/hash, compare and restore-as-new-version work end to end on QA-only data; and no credentials or non-QA data are exposed or altered.
