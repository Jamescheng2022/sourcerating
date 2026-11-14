# Windows B synthetic-user E2E (profile `sourcerating_playwright_e2e`)

Baseline: tag `qa-baseline-20261114` (= 3c8584f). Branch `qa/windows-b-e2e-20261114` only adds `qa/windows-b/`.

| Piece | File |
|---|---|
| Execution profile (approved entrypoints, allowed hosts, env allow-list) | `profile/sourcerating_playwright_e2e.json` |
| Host guard (localhost / Preview / synthetic tenant only; production denied) | `lib/guard.cjs` |
| Trace, screenshots, console, blocked-request logging; network allow-list | `lib/preload.cjs` |
| Runner (only entry the Director calls) | `runner/run.cjs` |
| Pass criteria and requirement map (pinned) | `acceptance/criteria.json` |
| Independent DB oracle (pinned SQL + expectations) | `oracle/` |
| Restricted Playwright tools for AGY | `tools/playwright-mcp.cjs`, `agy/` |
| Windows installer / least-privilege ACLs | `windows/install.ps1` (untested) |

Run: `QA_INTEGRITY_ROOT_SHA256=<owner hash> B_URL=… B_SUPABASE_URL=… B_USERS=… node qa/windows-b/runner/run.cjs`
Owner pins the harness with `node qa/windows-b/runner/pin.cjs` after any reviewed change.
Oracle role: `oracle/setup-readonly-role.sql` (owner runs once on the synthetic tenant); `ORACLE_DATABASE_URL` makes the runner finish in one step.
Evidence per run: `runs/<id>/{report.md,verdict.json,results.json,meta.json,manifest.json,logs/,traces/,screenshots/,db/,repro/,fix.diff}`.
