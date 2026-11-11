# Engineering Network — Atlas Backend Sync Receipt (2026-11-11)

**Status: PASS for published source snapshot and DB-backed project discovery. HOLD for continuous live GCP sync and public user publishing.**

## Confirmed backend state

Supabase project: sourcerating-p1 (qnozpurjtgkmwtvsrjoi). All new tables are isolated from existing SourceRating organizations, chats, rooms and project collaboration.

| Table | Rows | Visibility |
|---|---:|---|
| public.en_atlas_records | 17,337 | Public read-only with RLS |
| public.en_atlas_snapshots | 1 | Public read-only with RLS |
| public.en_atlas_org_mentions | 1,405 | Public read-only with RLS |
| en_atlas_internal.records_stage | 0 | Private staging with RLS |

The original source snapshot was generated 2026-11-09T02:57:03Z, and was imported after verification of source byte lengths, SHA-256 and record counts. Snapshot ID: atlas-2026-11-09-842207529389e7.

| File | Verified SHA-256 | Count |
|---|---|---:|
| manifest.json | 842207529389e7a7c316c4173b481d1d230d2e2f9aa837b2eab26db4cdf68714 | metadata |
| worldbank-projects.json | 861ace9480e1d02b300b0d2f0d17599f2130efcabf33df9ea94f9c4c9f06a83d | 16,642 |
| uk-procurement.json | 15745db0cb28d79554fd7f766d71e6dfb2f0679a320eddfea66c529e2c227d95 | 695 |

Verified 17,337 unique IDs, zero missing source URLs. Private stage → atomic publication → stage cleared. No temporary importer login or temporary HTTP extension remains.

## First source relationship layer

UK procurement excerpt retained complete original buyer and award structures. 698 unique record-level buyer mentions and 707 supplier mentions are in the organization-mention table (1,405 total after source-level deduplication), comprising 653 distinct name strings.

**Important:** These are source-declared references, NOT verified companies, signed construction contracts, authenticated people or site involvement. The World Bank statuses are not construction phases and UK award notices are not live open tenders. Thailand has 151 project/source records; 6,035 records have algorithmic engineering-title signals, which do not prove relevance.

## Git source / migrations

Branch: feature/engineering-network-v45-concrete-20261111

- apps/engineering-network/supabase/migrations/20261111150000_en_atlas_public_records.sql
- apps/engineering-network/supabase/migrations/20261111160000_en_atlas_source_org_mentions.sql
- apps/engineering-network/src/services/atlasCatalog.js
- apps/engineering-network/src/pages/AtlasProjectsPage.jsx
- apps/engineering-network/ (original preserved V4.2 frontend, V4.5 editor)
- .github/workflows/engineering-network-source-ci.yml

Vercel isolated preview deployment ID: dpl_Hv7teeTyZ2zadBZYfGPX3GcUM1yk. Status READY. Preview URL:

https://sourcerating-network-pilot-g78ume6i9-jamescheng2022s-projects.vercel.app/#/projects

Chromium browser QA: database-backed page HTTP 200; backend label **supabase**, correct published source breakdown 16,642+695; 32 visible cards with current filters; no JS exceptions or failing Supabase HTTP responses; no horizontal overflow at 390/768/1440px. Source detail route opens. Explicit static fallback if DB becomes unavailable.

Supabase permissions: anon SELECT=true, anon INSERT=false, anon UPDATE=false on the Atlas public records. Existing SourceRating collaboration schema untouched. Preview remains noindex,nofollow and production sourcerating.com unchanged.

## Remaining blockers before full automation and launch

1. **Live GCP source unverified**: Desktop Commander reached its monthly allowance. The imported snapshot is from Nov 9; no claim that the upstream GCP SQLite has been inspected or is synchronized through Nov 11.
2. Set up GCP to generate immutable public-source JSON/manifest deltas, review, check SHA/count and publish versioned snapshots. Protect importer credentials in GCP or CI secrets, scoped narrowly to Atlas staging. Never expose the service role or secrets in browser code.
3. Daily pipeline: GCP source → verified export → private staging → strict count/hash validation → atomic promote → monitor errors. Keep the last known-good published snapshot if a run fails. No daily automatic job has yet been enabled.
4. Replace pilot full-catalog client fetch with server-driven search, count and pagination before scaling traffic.
5. Real registration/cross-device private draft test, photo cloud storage, working provider-backed semantic AI review, author moderation and public SEO routes remain separate P0 release gates.
6. Do not migrate the existing sourcerating.com production site until acceptance, redirects, backups, rollout monitoring and rollback all pass.

**Release: DB snapshot + V4.6 preview GO. Continuous upstream sync and production release HOLD.**
