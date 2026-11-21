# Cloud acceptance: room archive download and private-session recovery

Implementation: `8cd64821a856fd9806bb8357ed5fec84e1061908`, on `codex/cloud-launch-20261023` in `/workspace/sourcerating`. This folder is evidence, not an additional application change. Full source hashes and test reports are in `manifest.json`.

The existing caller-authorized room archive API is now reachable from desktop and mobile UI. Downloads have explicit scope/size limits, cancellation, timeout, malformed/partial/cross-room rejection and safe retry. Room changes and sign-out cancel pending private downloads. Cross-tab sign-out discards private page state. A failed remote logout clears local identity when the installed SDK has actually removed it and reports that other sessions may remain active; it does not claim global revocation.

## Completed in the isolated cloud stack

| Validation | Result | What it establishes |
| --- | --- | --- |
| Next production build / TypeScript; ESLint | Both exit 0 | Current source compiles with the existing local public backend configuration. |
| New download browser suite | 15/15 | Real local Auth/RLS and empty-room UI downloads, 390px layout, cancellation/session behavior; explicitly labelled HTTP response fixtures exercise error paths and file serialization. |
| Existing evidence export | 6/6 | Real metadata download and caller/membership isolation. |
| Existing archive API | 6/6 | Real empty-room archive, anonymous/non-member denial and input validation. |
| Existing inquiries | 22/22 | Two submitters, account isolation, idempotency, persisted reload/restart and mobile form. |
| Existing password recovery | 8/8 | Synthetic account and local Mailpit capture/reset/old-password rejection, no real email. |
| Deno suites | 60/60 | Existing invite signature, file/archive validation and policy unit checks. |
| Public build configuration tests | 6/6 | Missing/unsafe public configuration fails honestly, including an actual config-missing Next build. |

Browser/API checks total 57 (15 new and 42 regression), with zero external browser requests and zero page errors. Do not interpret repeated login checks as distinct product features. Build, test output, per-check reports and two mobile screenshots are committed beside this file. Early development failures and a discarded local port collision are not included as successful runs; the recorded final runs were serial.

The new uploaded-file archive assertion in `apps/web/scripts/s2-web-e2e.cjs` checks actual UI download bytes and SHA256 against files uploaded through the real existing flow. It is **not run or passed**: invitation and file-gateway execution still await the approved network change. The file-bearing browser fixture is not evidence of that gateway chain.

## Current external boundary

At 2026-10-24 00:08:05 UTC, the environment is running revision 2, with current observations, restricted custom domains `fonts.googleapis.com` and `fonts.gstatic.com`, no `kong`, and enforcement state `unknown`. `network-status.json` records the exact environment/config/version/draft IDs. No denied gateway operation or GitHub deployment-record read was retried.

The already-approved minimum patch is only adding `kong` to `network.allowed_domains`; retain the preset and every other field. Operator entry: Work's saved environment **lushupai-v2**, Environment settings, Network / Internet access, restricted custom domains. These labels describe the intended settings area, not a verified UI screenshot. The available session tools cannot publish or create an independent clean draft. If the UI can only publish the complete revision 3, do not publish it: it also contains old repository pins and install/start instructions. Platform support must apply a network-only update to the current published version. Existing unpublished edits were read back unchanged. No additional user approval of `kong` is needed.

No new public preview/release was created or verified. The existing target is Vercel team `jamescheng2022s-projects`, App project `sourcerating`, `prj_Ra2cBP9kmKANgMm5xIFEXlV2c5IS`, root `apps/web`; never `sourcerating-website`. This session has no hosting metadata/configuration or preview-publish tool. The historical isolated backend `fzrberkeoizarduwuisp` remains a candidate, not a configured or migration-authorized target. The earlier missing-public-config preview failure is not resolved by a successful local build: hosted build-time public settings and backend isolation still require verification without reading/uploading secrets.

Release acceptance still needs a real public URL, invitation/attachment/complete-archive chain, synthetic user onboarding and authorized provider-mail recipients, current hosted service configuration, costs and an actually tested rollback deployment. No additional paid resource or persistent credential was created. Existing hosting costs/limits are unverified. There was no database/schema change in this implementation; source rollback can revert the implementation commit after review, but that is not evidence of a deployable or accepted rollback artifact.

Model receipt: the session exposes Codex based on GPT-6, without the exact variant/effort or an in-place model switch. Astra Max was not confirmed. One writer and the existing cloud workspace were used throughout.
