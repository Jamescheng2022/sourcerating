# SourceRating Engineering Network — V4.4 Editorial Iteration

**Date:** 2026-11-11. **Scope:** Keep original V4.2 front-end, original `/feed`, navigation and ComposeModal. This is not a redesigned website.

## What was implemented and tested in an independent Vercel preview

- Eight lightweight HTML/CSS article layouts selected inside the existing Engineering Publisher wizard, using semantic React components rather than unrestricted raw HTML injection.
- Six existing engineering content structures retained.
- Optional, author-selected short-answer suggestions for structured interviewing; free-text always available.
- Local conservative rule-based preflight: explicit length-unit conversions, pass/fail contradictions, unsubstantiated definitive claims, certain date-order inconsistencies, evidence gaps.
- HTML export with escaping and author-provided photo embeds; original Markdown draft and insert-back-to-ComposeModal retained.
- **No model API was called**, no claims or figures were invented, and the check is **not** a licensed engineer sign-off.

### Independent pilot deployment (tested)

https://sourcerating-network-pilot-fspl58xhg-jamescheng2022s-projects.vercel.app/#/feed

Vercel deployment: `dpl_HeMETvqicmNDtM7finWkXs1UTQhK` — READY. Tested on 390/768/1440 widths with a real browser, confirming option selection, article preview, review warning, HTML download and editor roundtrip.

## Source files persisted in this folder

- `src/data/engineeringArticleLayouts.js` — eight layout variants, answer-choice catalog, deterministic quality checks, escaped HTML export.
- `src/components/article/EngineeringArticlePreview.jsx` — safe semantic preview.

The modified original `src/components/modals/EngineeringPublisherWizard.jsx` is **present in the deployed preview source bundle but not yet copied into this GitHub folder**. Do not treat this subfolder as a complete standalone build or claim that the full V4.2 source has been committed. Recover from the build artifact before the temporary sandbox archive expires, or from the separately retained original code package and apply the patch.

Complete V4.2 Atlas source reference: https://drive.google.com/file/d/1NQNhZ8u5TeWljur7QSnIUc1m-uNmcc0X/view
Archived temporary V4.4 source bundle (temporary host; not durable): https://sb-3o7tsecgzh4q.vercel.run/sr-v44-editorial-source-20261111.tgz

## Next release gates

1. Persist and review the complete working V4.4 source under a proper dedicated repository or source branch.
2. Replace rule-based-only copy with a real **authenticated, server-side semantic audit** that quotes the author's own claim and flags concerns without silently making edits.
3. Publish real articles only after identity, ownership, server storage, media rights, anti-abuse, moderation and public-route indexing are verified.
4. Keep publicly sourced project records distinct from author-confirmed project participation. Preserve visual-template disclosure.
