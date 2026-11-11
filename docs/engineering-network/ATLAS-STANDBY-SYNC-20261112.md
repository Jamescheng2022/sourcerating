# SourceRating Engineering Atlas — Standby synchronization acceptance
Verified 2026-11-12 (Asia/Shanghai)

## Objective

Keep a **safe source-data intake channel** functioning when GCP → Windows B and Desktop Commander are unavailable. Do not alter production sourcerating.com, the original V4.2 homepage, published Atlas records, members, rooms, or personal data.

## Confirmed working channels

### A. GitHub Actions → Official UK API → authenticated Supabase staging

- Runner workflow: `.github/workflows/en-atlas-standby-refresh.yml`
- Script: `apps/engineering-network/scripts/standby_official_refresh.py`
- GitHub run: https://github.com/Jamescheng2022/sourcerating/actions/runs/43122128994 — **all steps success**
- UK official API: https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search
- Auth: GitHub Actions OpenID Connect, OIDC claims checked against EXACT owner/repo/feature branch/workflow/audience, signature verified by remote GitHub JWKS. No shared Supabase admin key in GitHub or frontend.
- Supabase Edge function: `en-atlas-oidc-stage`; `verify_jwt=false` at platform because function verifies the **GitHub** JWT itself (not anonymously open).
- Result: 99 source candidates from this GitHub run staged privately; no public project publication.
- GitHub schedule note: this workflow is on the **feature branch**, so `push` and manual triggers work, but GitHub native `schedule` does NOT run on that branch because schedules require the default branch. Do not claim otherwise or merge to production merely to enable cron.

### B. Independent database-native daily polling (primary recurring fallback)

- Supabase: `sourcerating-p1` project `qnozpurjtgkmwtvsrjoi`
- Job: `cron.job` id **3**, name `en_atlas_uk_refresh_standby_20261112`, active true, postgres-owned.
- SQL command: `select en_atlas_internal.refresh_uk_candidates();`
- Schedule: `47 2 * * *` (**02:47 UTC**, **09:47 Bangkok**, **10:47 China** daily).
- Source: official UK Contracts Finder OCDS search; fixed official host and path, up to four pages, at most 100 relevant candidates per run, last three days lookback.
- Security: no user input or dynamic outbound host; function is in non-exposed private `en_atlas_internal` schema. Browser/anon cannot EXECUTE the private function. `extensions` schema is NOT exposed to PostgREST (negative HTTP 406 PGRST106 verified). The database HTTP extension has public EXECUTE ACL due to Supabase extension defaults but is not exposed in the PostgREST API; monitor for changes to API schema exposure.
- Manual test: 341 OCDS releases scanned across 4 pages; 100 candidate records processed, JSON response `published_untouched=true`.
- Dedup: GitHub+Supabase independently touched overlapping notices; result **102 unique** private candidate records, all pending review. This is a small **subset**, not an exhaustive UK procurement feed.
- Cron worker process checked running, job active. Future scheduled run success cannot be claimed before it actually executes.

### Private tables

| Table | Current verification | Rights |
|---|---:|---|
| `public.en_atlas_refresh_candidates` | **102 unique** pending source candidates | No anon/authenticated access, RLS on |
| `public.en_atlas_refresh_runs` | **2 recorded successful manual/action runs** | Server-only, RLS on |
| `public.en_atlas_records` | **17,337 published source snapshot rows** | public SELECT only, unchanged |
| `public.en_atlas_snapshots` | **1 verified snapshot** | public SELECT only, unchanged |
| `public.en_atlas_org_mentions` | **1,405 source mentions** | public SELECT only, unchanged |

**Do NOT treat 102 candidates as vetted site projects or merge them into the 17,337 row catalog until source-by-source acceptance.** A UK award is not an open tender or proof of contract execution. No private contacts have been collected.

### Source code preservation

- SQL migration and cron: `apps/engineering-network/supabase/migrations/20261112000000_en_atlas_standby_sync.sql`
- GitHub signed OIDC Edge source: `apps/engineering-network/supabase/functions/en-atlas-oidc-stage/index.ts`
- Workflow and Python source live in the engineering-network feature branch.
- All changes were isolated. No Vercel production deployment or DNS action.

## Monitoring

A separate condition-only automation checks cron job status, run logs, candidate freshness and last good published snapshot and **only alerts on failures/unknown state**.

- Automation ID: `6af4ffdf6f608191b1b94fe6c6bf76a0`
- Check: after each daily 02:47 UTC database refresh (roughly 03:30 UTC).
- Task is for the SourceRating Atlas standby sync only, not the four-site publication task.

## Quality gates and incomplete work

1. **Cron first scheduled execution**: watch actual `cron.job_run_details`; a manual run and active job are not proof of successful future scheduling.
2. **Scope**: UK Contracts Finder only for daily refresh. World Bank API was queried successfully but is not yet an automatically updated source; GCP SQLite latest snapshot could not be accessed while Desktop Commander was rate-limited.
3. **Completeness**: bounded 3-day/4-page/100-candidate polling can miss notices during high volume. Implement persistent official API cursor, handling revisions/deletions, per-run source digest and reconciliation before considering it exhaustive.
4. **Promotion**: no auto-merge to `en_atlas_records`. Add human moderation, quality thresholds, source license attribution and duplicate/legal-entity checks before public display.
5. **Production stability**: maintain last-good snapshot on all upstream errors. Inspect cron schedule results, memory/cost and DB workload. Scope credentials to Atlas staging if integrating GCP later.
6. **App**: original V4.2 frontend remains unchanged by this fallback; V4.6 preview already reads Supabase Atlas and has an explicitly labeled static fallback.

## Useful SQL verification

```sql
select jobid, jobname, schedule, active, username
from cron.job where jobname='en_atlas_uk_refresh_standby_20261112';

select start_time, end_time, status, return_message
from cron.job_run_details where jobid=3 order by start_time desc limit 10;

select count(*) as candidates, max(observed_at) as last_seen
from public.en_atlas_refresh_candidates;

select (select count(*) from public.en_atlas_records) published,
       (select count(*) from public.en_atlas_refresh_candidates) private_candidates;
```

The manual rescue/rollback is to `select cron.unschedule('en_atlas_uk_refresh_standby_20261112');` as an authorized database operator. Stopping the job **does not** affect the 17,337 published source records or the V4.2 frontend. Do not delete candidate data without review.

**Decision: GO on independent UK source intake and verified GitHub staging; HOLD on automatic publication, claims of exhaustive worldwide live sync, and production domain cutover.**
