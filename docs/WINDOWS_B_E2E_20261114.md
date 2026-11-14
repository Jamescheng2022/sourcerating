# SourceRating Windows B synthetic-user E2E — delivery report (2026-11-14)

**Verdict for the local run: PASS (37/37 browser checks, 29/29 database oracle checks, 11/11 requirements).**
**Verdict for the stated goal "AGY on Windows B runs it": NOT DELIVERED.** Windows B (JAMESGEAR) was unreachable, so
nothing was installed or run there and AGY never drove the tools. Everything below ran in the cloud workspace.

## Why Windows B was not reached
- Desktop Commander lists JAMESGEAR as offline for 98 h, and its monthly tool quota is exhausted (calls paused).
- The only live local bridge (`BangkokTerminalClaudeBridge`) is review-only (`write_scope: results-only`); it cannot run commands or install files.
- No folder on that machine was connected to this session.

## What exists (branch `qa/windows-b-e2e-20261114`, only adds `qa/windows-b/` and docs)
| Requirement | Delivered | State |
|---|---|---|
| 1 Verify repo / branch / commit / scripts, overwrite nothing | Baseline tag `qa-baseline-20261114` = `3c8584f`; existing E2E is unmodified and hash-pinned | done |
| 2 Isolated workspace | git worktree `sourcerating-e2e`, own build and server; production workspace untouched | done (cloud) |
| 3 Fixed profile `sourcerating_playwright_e2e`, approved entrypoints only | `profile/…json` + `runner/run.cjs` (refuses anything else) | done |
| 4 Restricted Playwright tools for AGY | `tools/playwright-mcp.cjs`: 18 tools, no shell, no JS eval, no free URL, no files outside `runs/`; typed e-mails must be synthetic personas | done; exercised with a real browser; **not connected to AGY** |
| 5 Synthetic multi-user scenarios | baseline T1–T6 (4 accounts, 2 orgs) + new offline-recovery (5 checks) | done |
| 6 Allowed targets only | localhost, `sourcerating-room-lab.vercel.app`, Supabase `nunojlfangvnjlwggvvb`. Production `qnozpurjtgkmwtvsrjoi`, historical stage2 `fzrberkeoizarduwuisp` and every other project/Vercel host are refused (tested) and blocked at network level in every browser context | done |
| 7 Independent oracle | `oracle/` SQL + pinned expectations: 29 checks (sequence, hash chain, file versions, SHA, storage objects, version-bound confirmations, final state, isolation, row-level-security probe as each user) | done; see limits |
| 8 Evidence | per run: report, verdict, results, meta, manifest with SHA-256, logs, Playwright traces, screenshots, console, blocked requests, DB SQL + result, `repro/NN.md`, `fix.diff` | done |

Safety behaviour tested: refuses to start with no owner root hash, with production/stage2/other Vercel host, with a service-role key in the environment, with an unapproved suite, and after any pinned file (including `criteria.json`) is edited.
Pre-flight: a broken target is reported as BLOCKED, not as product failures.

## Results
| Run | What | Result |
|---|---|---|
| `20261114T035637` | first run, my local server mis-configured (stale public-key variable, then a stale process on port 3100) | 28 pass / 9 fail — **environment error, not product**; kept as evidence in `run-env-misconfigured/` |
| `20261114T040604` | after fixing the environment, clean build of the baseline commit | **PASS** — UI 37/37, oracle 29/29, requirements 11/11, 0 blocked requests |
| `20261114T040954` | control: failure injected on purpose into a copy in `work/` | FAIL as designed (R10); repro, screenshots and diff produced. Oracle rows are borrowed from the PASS run, so this run's oracle part is not evidence |

Coverage: 97% = (37 UI + 29 oracle) of (37 + 29 + 2 declared gaps). 100% of the executable checks.
Declared gaps (not run): real language model (only a local stub), soft keyboard on a physical phone.

## Fix loop
Test-side defects found and fixed in the harness (not in the product): failure-screenshot hook did not match the baseline's log format;
no pre-flight; the oracle's "member" definition ignored organisation removal (it flagged a correctly blocked user). Each change was re-pinned and the suite re-run to PASS.
No product code was changed.

## Findings
1. **Low — browser calls the file gateway directly and is blocked by CORS.** `lib/room-files.ts` uses `supabase.functions.invoke("room-file-gateway")`;
   from `http://localhost:3100` the response has no `Access-Control-Allow-Origin`. Uploads still verify because the same-origin relay repeats the call, but each upload logs a failed request.
   The gateway's CORS allow-list is at its default; the Preview origin needs the same check. Evidence: `run-pass/logs/console.jsonl`.
2. The other console errors were expected (403s from isolation tests, offline test, one 400 whose source was not traced).

## Not verified / limits (please read)
- **Windows B install** (`windows/install.ps1`) was written without access to a Windows host and is untested, as are its ACL commands.
- **AGY as Test Director** (`agy/`) is a prompt and an MCP config, not exercised.
- **Oracle independence is partial.** I wrote the SQL and expectations and ran the SQL through the Supabase connector with owner-level access, then fed the rows to the evaluator.
  The designed path (`ORACLE_DATABASE_URL`, read-only role from `oracle/setup-readonly-role.sql`, `pg` driver) was not exercised.
- **Tamper protection** needs the owner to keep the root hash (`QA_INTEGRITY_ROOT_SHA256`) where the Director cannot write; here I held it myself, so it proves detection, not protection from me.
- **Targets:** only localhost against the staging Supabase. The Vercel Preview was not tested (not reachable from this workspace); stage2 is not authorised in the profile.
- Staging still holds the QA test data of every run (names `QA …`); not cleaned up.
- Chrome's own background traffic to Google accounts was refused by the workspace proxy; it is outside the test contexts and unrelated to results.

## To finish the original goal
1. Bring JAMESGEAR online (and restore the Desktop Commander quota, or connect `D:\AgentWorkspaces\sourcerating-e2e` as a folder).
2. Owner runs `windows/install.ps1`, creates `secrets\users.json`, sets `QA_INTEGRITY_ROOT_SHA256`, and creates the oracle role.
3. Add `agy/mcp-config.json` as AGY's only MCP server and give it `agy/test-director-prompt.md`.
4. Allow the Preview host and re-run against it; decide whether stage2 may be added to the profile.

Evidence: `docs/windows-b-e2e/` (run-pass, run-control, run-env-misconfigured). Traces are in the separately delivered zip.
