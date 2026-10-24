# SourceRating App — minimum release gates, 2026-10-24

Documentation/evidence continuation only. Checkout `/workspace/sourcerating`, branch `codex/cloud-launch-20261023`; existing functional/evidence head `70d3192a9c0affd9bf18a17aa5562cc20466b247` is preserved. No application code, credentials, provider configuration, data or network policy was changed. Unchanged suites were not rerun for a documentation-only update. Earlier cloud results do not establish current public acceptance.

## Resource status update supplied by the parent — 03:12 UTC

The parent used the permitted Supabase `get_project` operation at **2026-10-24 03:12 UTC** and reported both projects **INACTIVE**: `sourcerating-stage2 / fzrberkeoizarduwuisp` and `lushupai-dev / jwejjhudbwvrtpmieuli`, organization `fbnbdgbzbfivjuaracni`, region Singapore. These are status facts only, **not Preview binding or isolated-schema proof**. No provider query was repeated here.

The parent has requested restoration **on the existing plans with no additional cost**; approval is still pending. Do not restore either project or send test email while those approvals are pending. No business code or production setting is changed by this correction.

## Known target, without another denied metadata read

Owner-supplied Vercel **App** target: team `jamescheng2022s-projects`, project `sourcerating`, ID **`prj_Ra2cBP9kmKANgMm5xIFEXlV2c5IS`**, root **`apps/web`**. Never substitute `sourcerating-website`. Use the authorized development branch above; preserve production/customer branch and traffic. The current actual Preview URL, configuration binding and accepted rollback deployment remain unverified. No GitHub deployment records or previously refused environment metadata were requested.

The parent's independently obtained deployment evidence says `dpl_7tckox7NuPqb7FmsXKsxRsUsTk9m` at `70d3192a` fails because `NEXT_PUBLIC_SUPABASE_URL` or a public key is missing. This executor did not retrieve that record. The failure is a **build configuration** failure; the historical backend being paused is a separate runtime/resource gate.

## Exact code-consumed settings and dependencies

| Setting / gate | Required action and boundary |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Existing App project's Settings → Environment Variables → **Preview**, including the branch override. Use the approved isolated HTTPS backend origin; no production, loopback, kong or placeholder value. Compiled into browser code, so rebuild after configuration. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` **or** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Exactly one public key from that same authorized backend; no service-role/secret key. The code allows equal aliases but rejects conflicting values. No new credential was read/generated/configured. |
| `SR_INVITE_RELAY_PROJECT_REF` | Server-side non-secret project binding, checked against the exact relay project constant. The code currently binds to `fzrberkeoizarduwuisp`. |
| `SR_INVITE_RELAY_SECRET` | Existing server-only HMAC secret shared with the isolated invite function; its value is not read here. Configuring/replacing it is a separate credential action. Never expose it in `NEXT_PUBLIC_*`. |
| Vercel-injected `VERCEL`, `VERCEL_ENV`, `VERCEL_GIT_COMMIT_REF` | Relay requires Vercel Preview and the exact configured branch. Do not spoof platform metadata in environment variables or remove the guard. |
| Vercel-injected `VERCEL_URL` / actual request Host | Hosted relay derives the origin from the actual `Host` header and requires `origin === https://${VERCEL_URL}`; request `Origin` must also match. Preserve this exact-host restriction alongside the exact branch binding; do not substitute an arbitrary alias or relax the guard. |
| Recovery redirect | Current code computes `window.location.origin + '/reset-password'`; the complete URL must use the **confirmed App Preview origin**. A project ID does not establish a hostname. Do not invent a URL or configure a wildcard. |

Evidence: `apps/web/src/lib/public-supabase-settings.mjs`, `supabase-config.ts`, `invite-relay-server.ts`, `apps/web/next.config.ts`, `apps/web/src/app/forgot-password/page.tsx`, and `supabase/functions/_shared/invite-relay.ts`.

**Registration stays closed:** preserve `[auth] enable_signup = false` in `supabase/config.toml` and the existing signup-disabled policy. Acceptance is **email-bound invitation, login and recovery**, not open self-registration. This source policy is not a fresh hosted-settings read or proof that any new configuration was applied. Do not enable signup to make acceptance pass.

### Backend relationship versus Preview binding

`supabase/functions/_shared/invite-relay.ts` explicitly has `RELAY_PROJECT = "fzrberkeoizarduwuisp"` and `RELAY_BRANCH = "l1/stage2-continuation"`. This is non-secret **historical App relationship evidence**, not proof of today's Vercel Preview variables, schema isolation, authorization to connect or migrate. The parent independently reports `SourceRating-stage2 / fzrberkeoizarduwuisp` as **INACTIVE**. It was not queried, resumed, upgraded or migrated this round.

There is an additional concrete mismatch: `relayConfig()` requires `VERCEL_GIT_COMMIT_REF === RELAY_BRANCH`, so a hosted Preview built from `codex/cloud-launch-20261023` is currently rejected by the invite relay even if the public URL/key are present. This mismatch remains blocked. A [one-line review patch and isolated compatibility evidence](proposals/INVITE_RELAY_BRANCH_20261024.md) now prepare the exact development-branch replacement; **application source and hosted policy remain unchanged**. Preserve the exact branch binding and actual Host/`VERCEL_URL` restriction; this checklist authorizes neither applying the patch nor relaxing guards. Applying the proposal requires explicit coordinated review after the intended isolated backend and both relay deployment bindings are established. Do not add arbitrary branches, fake the Vercel variable, repoint existing customer traffic or claim a frontend rebuild alone fixed invitations.

### kong remains a separate cloud-test gate

Existing approval is **only** adding `kong` to the original Work environment's restricted network allow-list. Parent reports it remains unapplied. No Edge Function → kong request was retried. Original local kong health is separate from network permission.

The saved environment name/setting from the prior supported read is **lushupai-v2 → Environment settings → Network / Internet access → custom allowed domains (`network.allowed_domains`)**. The exact authorized delta is `+ kong`, preserving all other domains, restrictions, repository references and scripts. It is not permission to publish revision 3's mixed draft. [Existing exact proposal and missing network-only apply capability](CLOUD_KONG_ONLY_20261023.md) retains the original instance/config/draft identifiers; this round did not refresh denied environment metadata. Parent/operator must apply only that field through a supported operation and provide fresh enforced-policy evidence before the known refused gateway action is retried once.

## Smallest remaining decisions

1. Parent completes the already-approved kong-only application and enforcement readback. No new approval for kong is requested. This unlocks only cloud invitation/attachment/archive gateway tests, not Vercel connectivity.
2. Using the existing authorized provider session, establish the actual App Preview origin and isolated backend/relay bindings without requesting the known project ID again. Keep the INACTIVE candidate paused this round. Resume/configure/migrate is not bundled into code-development authority; a later concrete proposal must establish isolation, current data, costs and rollback first.
3. Once a real isolated backend is approved and available, review the exact Preview public URL/key and existing server-only credential references, recovery redirect, and coordinated invite branch binding. Do not configure secrets or broaden security just to pass a build. Rebuild only with real authorized settings.
4. **Email permission is still absent.** Proposed only recipient: **rivercheng1021@gmail.com**, for email-bound invitation, login and password-recovery acceptance within the existing signup-disabled policy. Use explicit synthetic invited identities; no customer mail or open-registration test. Do not send until the recipient/purpose are explicitly approved. A second identity for real two-account isolation needs its own approved access; don't invent aliases.

No new paid resource has been shown necessary. Current plan/quotas and any cost of restoring the paused candidate are unverified; no price, free entitlement or purchase is assumed. Payments remain sandbox-only.

## Delivery acceptance still outstanding

On the actual App Preview, record email-bound invitation, login and recovery with signup disabled, re-login readback, permissions and second-invited-account isolation, invitation bootstrap/join, enquiry and evidence flows, authenticated file upload/download, attachment bytes/hashes in complete archive/export, mobile layout and offline/error recovery. Preserve exact relay branch and actual Host/`VERCEL_URL` checks throughout. Cloud fixtures or empty archives do not replace that evidence. Keep legal/customer data out of synthetic acceptance.

Final handoff needs the real accessible URL, provider deployment ID, commit/environment, schema version, verification evidence, known limits and current costs. Rollback must identify a tested previous deployment in the **same App project** with compatible data/session behavior; `70d3192a` alone is a source reference, not an accepted rollback deployment. No data restore, production deployment or irreversible deletion was performed.
