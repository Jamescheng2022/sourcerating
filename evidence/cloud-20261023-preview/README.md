# SourceRating cloud continuation acceptance — 2026-10-23

Implementation `2d685a5213a0fa91331c5b32afa413ac7c5b6dc1`, branch codex/cloud-launch-20261023, /workspace/sourcerating. Source unchanged after these tests; subsequent commit only records evidence.

## Executed on this implementation

| Check | Result and real boundary |
| --- | --- |
| npm run test:config (apps/web) | PASS 6. Actual Next config loaded in disposable no-.env project; missing variables fail before compile, no fake fallback. Pure fixtures never contact Supabase. |
| python /workspace/tools/run-sr.py build | PASS Next build/TypeScript using existing local isolated backend public configuration, not Vercel. |
| npm run lint | PASS. |
| Deno test --sloppy-imports --allow-env --allow-read --allow-net supabase/functions/tests supabase/scripts/target_guard_test.ts | PASS 60 isolated tests, including 12 archive tests. |
| run-sr.py archive | PASS 6 local HTTP/browser checks; Auth/RLS, empty room, no live gateway. |
| run-sr.py export | PASS 6 local checks, actual UI metadata-index download, 390px, anonymous/other/removed member denials. Not attachment-byte integration. |
| run-sr.py inquiries | PASS 22 local checks, persistence/restart, concurrency, mobile and ownership denials. |
| run-sr.py recovery | PASS 8 local checks with synthetic account and local Auth mailbox; no external email. |

Logs, reports and synthetic mobile screenshots are in this directory. All commands exit 0. No assertions removed or reduced. No invitation/file-gateway retry, no production/customer data, payment, hosted migration or external mail.

## Public delivery is BLOCKED, not passed

User-reported Vercel deployment EcYb8bneBHCnZLx3Kk2iMDDRxpeC on previous c6d9eab failed because build public settings were missing. This change preserves failure, improves pre-compilation diagnosis and rejects unsafe key/URL configuration; it cannot supply or approve hosted settings. No authenticated Vercel tool/CLI is available. GitHub deployment reads returned Forbidden; action stopped, no alternate path attempted. No real public URL or deployment acceptance is available from this run.

See ../../docs/PREVIEW_CONFIGURATION.md for the exact variable names, Preview/branch scopes, root apps/web, hosted isolated backend requirement, cost/rollback and new-user checklist. SourceRating App must not be confused with the website. Real invite/file chain, new-user signup/verification with approved recipients, public two-account flow and actual attached bytes remain BLOCKED/unrun. Existing bounded archive API is not arbitrary project-wide export; deletion remains design-only.

## Minimum owner decisions/actions

1. Confirm existing App hosting project URL/name + linked repo/branch and dedicated isolated Supabase target, avoiding customers/website. Supply only identifiers through chat, credentials through approved secure settings. Preview needs real authorized public URL/public key from the same isolated project; no loopback/placeholder. Rebuild only after those settings are approved. No production target inferred.
2. Current cloud network and draft were freshly checked; see network-observation.json, not the earlier 08:45 report. Only proposed network addition is hostname kong under restricted allowed domains. Existing draft also pins both repos to old commits and changes setup/start scripts: bulk publishing may restore outdated code/instructions. No network/draft change was made. Published state remains revision 2, policy unknown, no kong. Approval/application would permit a meaningful new test, not guarantee success or repair Vercel configuration.
3. Confirm mail provider/sender and explicit test recipient(s), server credential/relay identity destinations through approved settings, migration review for an isolated hosted backend, existing plan limits/cost ceiling and rollback target. None created/charged/uploaded. Required approval is still pending, not inferred from elapsed time.

Internal local Next preview was exercised by owned test servers and stopped after tests. The managed cloud environment is running; no public release was deployed. Code rollback is prior c6d9eab in the same confirmed App project, with no database migration rollback needed for this change. Actual live prior deployment ID and operational costs remain unknown and must be captured before delivery.
