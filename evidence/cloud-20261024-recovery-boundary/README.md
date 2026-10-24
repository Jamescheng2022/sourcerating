# Cloud recovery resumed; password account boundary fixed

Implementation commit: `6a23acb5688c75c496813f77a57ac0e121800b33`, on `codex/cloud-launch-20261023`. This evidence commit is separate from application functionality. The previous archive feature `8cd64821` and evidence `7373290e` are retained.

The platform's supported `wait_for_environment` operation returned `ready` for the original environment. An actual shell command then returned `/workspace`, both expected branches/HEADs and clean worktrees. At 2026-10-24 00:49:20 UTC, a fresh runtime read showed `connected`, `running` and current observations. Revision 2 alone was not used as evidence of connectivity. See `environment.json` for the precise environment/config/version IDs and file-receiving capability receipt.

## Reproduced defect and implemented fix

Before the fix, an expired recovery callback in a browser already signed into a project displayed a password-change field for the existing project account. `baseline.log` records the real local browser failure: one field found when zero was expected. During the fix, the new account-boundary test also caught normal-client preloading consuming the recovery callback.

The recovery page now uses the existing Supabase SDK with separate tab-scoped session storage. The ordinary project client does not consume reset-page callback credentials, including during Next preloading. Invalid/reused callbacks clear the older recovery state and cannot fall back to the project login. Valid recovery survives a tab reload, displays the account being changed and remains bound to that account when the project login changes elsewhere. A successfully changed password is reported accurately even if subsequent server logout fails. No authentication check, server policy or test assertion was weakened.

## Current-source results

| Check | Result | Boundary |
| --- | --- | --- |
| Production Next build / TypeScript and ESLint | Exit 0 | Existing isolated local public backend configuration. |
| New recovery-boundary browser suite | 11/11 | Real local Auth/Mailpit, distinct recovery/project accounts, consumed link, reload and cross-tab project account switch; explicit fixtures for update/logout failure responses. |
| Existing password recovery regression | 8/8 | Actual successful local reset/logout, old-password denial and server password minimum. |
| Previous archive-download regression | 15/15 | Existing real local empty-room UI downloads and labelled failure/serialization fixtures. |
| Public configuration suite | 6/6 | Missing/unsafe hosted settings continue to fail honestly. |

There are 34 browser/API checks in this round, including repeated setup/login checks; they are not 34 distinct product features. All recorded browser runs have zero external requests and zero page errors. Final runs were serial. The application source hashes in `manifest.json` match the implementation commit; tests ran on those bytes before the commit. Deno, inquiry and other unaffected suites were not counted as newly rerun. Logs retain substantive output; only terminal carriage returns and trailing whitespace were normalized, with original raw hashes retained. No password, session token or recovery URL is stored in these reports.

For reproduction, use the existing local stack and the commands in `manifest.json` / `apps/web/scripts/README-s2.md`. Test credentials remain outside Git. Screenshots show synthetic `.invalid` test addresses only. The first recovery email was captured by local Mailpit; a subsequent fresh grant came from the local Auth admin API to avoid resending/rate-limit retries. Neither is real external email delivery.

## Remaining delivery boundary

The approved `kong` hostname is still absent from the current policy; enforcement state remains `unknown`. There were no configuration writes, blocked Edge Function retries or refused GitHub deployment-record reads. Invitation/file/archive integration and a real public preview are not accepted by these results. The existing Vercel App target and hosted-configuration restrictions remain unchanged; no persistent service credential, migration, real email, payment or new environment was configured. No deployment was requested or verified. A code revert is possible, but is not a tested hosted rollback deployment.

LUSHUPAI remains untouched at `468b1597a24b103877b97ae4548cd675b6c40fac`. The parent reports both sanitized packages verified, but this task has not imported them. Available receiving mechanisms are a genuine Sediment upload (maximum 32 MiB) or a file path accessible in this same cloud environment; Library prepare/download is absent. File Service IDs must not be passed to the Sediment downloader. No repeated historical source search was performed in this round.

Model receipt: only Codex based on GPT-6 is exposed. Exact variant/effort and an in-place model switch are unavailable; Astra Max is not confirmed. The work used one writer and the original cloud environment.
