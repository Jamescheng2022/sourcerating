# SourceRating Engineering Network — V4.5 Cloud Drafts + AI Audit Handoff

**Date:** 2026-11-11  
**Authority:** Continue the existing V4.2 engineering-network frontend. Do **not** redesign the homepage, three-column desktop layout, mobile navigation, magazine editor, or feed. Do **not** modify `sourcerating.com` production unless Owner authorizes an explicit release.  
**Preview:** https://sourcerating-network-pilot-bwmmkr87q-jamescheng2022s-projects.vercel.app/#/feed  
**Vercel project:** `sourcerating-network-pilot` (`prj_DnQEaL66BODU41SwAt4cJow8gUQH`)  
**Ready deployment:** `dpl_6vbZwm5WSPAe6rKxG76qyqbvJ2DR`

## Completed in this turn

1. Preserved original V4.2 homepage and Atlas project discovery (17,337 archived source records, 50 selected real-source feed examples) plus V4.4 editor (eight CSS layout styles, six engineering article structures, source evidence checks).
2. Used existing active SourceRating Supabase project `sourcerating-p1` (`qnozpurjtgkmwtvsrjoi`) without changing preexisting organization, room, or project tables.
3. Created **only** two isolated tables:
   - `public.en_pilot_article_drafts`: owner-only, private text/structured drafts, author UUID linked to `auth.users`, RLS, no public `published` status.
   - `public.en_pilot_ai_review_usage`: server-only AI request counters, RLS with no user policies intentionally.
4. Added Supabase Auth email/password login and account registration form **inside the existing Engineering Publisher**. Server draft save/list/reload is only exposed when a Supabase user session exists. Local images are **not** persisted; do not claim otherwise.
5. Deployed a new Supabase Edge Function `en-pilot-article-audit` with `verify_jwt=true`, explicit author consent from UI, email verification requirement, origin restriction, 30–10,000 character input, 3 requests / 24h limit per user, server-only provider key, no automatic article rewriting. Model access is **not confirmed**; function returns `MODEL_NOT_CONFIGURED` if `DEEPSEEK_API_KEY` is absent.
6. Retained deterministic frontend checks for contradictory dates/units and missing evidence.

## Verified

- Vercel deployment state **READY**; complete Vite build passed.
- External page fetch rendered `/#/feed` and `/#/projects`, keeping original page titles and content. Preview sets `noindex,nofollow`.
- Chromium QA on **390 and 1440 px**: existing modal, article interview, review warnings, private account section, and disabled unauthenticated cloud-save behavior; no browser page errors.
- API negative tests:
  - `GET/POST /rest/v1/en_pilot_article_drafts` using publishable API key without user token: HTTP **401**.
  - `POST /functions/v1/en-pilot-article-audit` without user token: HTTP **401 AUTH_REQUIRED**.
  - Supabase Auth password grant for nonexistent test identity: HTTP **400 invalid_credentials**.
- Supabase table inspection confirmed RLS and owner policies for private drafts.
- Security advisor: no missing RLS/new exposed user-table finding; `rls_enabled_no_policy` INFO for server-only `en_pilot_ai_review_usage` is intentional. Several **preexisting** other-project warnings remain and were not modified.

## Not verified and not claimed complete

- End-to-end successful signup/login with a real email address, email confirmation redirect, or two-session save/reload. A real user must verify this; the Supabase Auth redirect allowlist may need the independent preview URL.
- Actual DeepSeek semantic audit, because the function's provider secret availability was not verified, and no authenticated test account was used. **Do not advertise the model as working** until a genuine review response returns successfully.
- Storage of author-uploaded photos in Supabase Storage; currently they remain in the browser. Only text/structured metadata is saved to private drafts.
- Moderated public publishing, approval, anti-abuse review, author/company verification, public SEO indexing and article structured data. Deliberately disabled.
- Full source commit to GitHub. The available branch contains preview build scripts and partial `pilots/engineering-network-v44` source, **not** the full V4.5 source tree. The full source exists in the Vercel sandbox archive below, but its host can expire.

## Source / build handoff (temporary, protect ASAP)

- GitHub repository: `Jamescheng2022/sourcerating`, branch `preview/v42-realdata-feed-20261111`, preview build script `build-v45-private-drafts-preview.sh` at commit `1ae01c77bcaf8c2383c9d127fd6b4a8516533d70`.
- Complete buildable source tarball from Vercel sandbox:  
  `https://sb-3o7tsecgzh4q.vercel.run/sr-v45-auth-drafts-20261111.tgz`
- gzip SHA256 `8360f79e39edd3501b8cf1b3873ea45b929f6a6526767d42ae21466adbb6ed7c`
- uncompressed TAR SHA256 `03408f3281530ae6c8d570c2da54c65b5319692d252765b0a30c8713a788ad41`
- Key files: `src/services/enPilotClient.js`, `src/components/article/EngineeringCloudDrafts.jsx`, `src/components/modals/EngineeringPublisherWizard.jsx`, `src/data/engineeringArticleLayouts.js`, `src/components/article/EngineeringArticlePreview.jsx`.
- The frontend includes only a **publishable** Supabase key. Do not commit service-role keys or model API keys.
- Original V4.2/Atlas source archive: https://drive.google.com/file/d/1NQNhZ8u5TeWljur7QSnIUc1m-uNmcc0X/view

## Next highest priority

1. On an authorized development workstation, **download and SHA256-verify the temporary full-source tarball**, commit the full buildable tree to a dedicated private or appropriately access-controlled repository/branch, and configure CI from source rather than a temporary Vercel sandbox asset.
2. Verify real email/password signup and login on the preview with an actual test account and allowlisted redirect URL. Save draft; sign out; open another browser/device; sign in again; confirm the saved draft appears. Test cross-user privacy.
3. Decide which paid provider account supplies `DEEPSEEK_API_KEY`; configure it **only as a Supabase Edge Function secret**, with a provider-side spending cap. Explicitly authorize a real model audit test before measuring success and cost. Never embed the key in frontend code.
4. Implement authenticated photo uploads with file limits, MIME/extension validation, private buckets, upload owner policies, safe web display and deletion.
5. After actual trust, abuse and moderation verification, implement limited public posting with true canonical URLs, metadata, Article/BlogPosting structured data, sitemap, and indexability. Until then keep pilot `noindex`.
6. Review pre-existing Supabase Security Advisor findings separately before production changes.

**Release decision:** Preview OK for owner visual testing; **HOLD** on production migration, true public article publishing, and claims of fully functional AI semantic review.
