-- SourceRating Engineering Network P0: isolated public-source Project Atlas projection.
-- Idempotent schema; live GCP/SQLite importer is NOT part of this migration.
-- Never modify public.projects or the existing organization/chatroom data model.
begin;
create schema if not exists en_atlas_internal;
revoke all on schema en_atlas_internal from PUBLIC, anon, authenticated;

create table if not exists public.en_atlas_records (
  record_id text primary key check (char_length(record_id) between 6 and 120),
  record_kind text not null check (record_kind in ('world_bank_project','uk_procurement_notice')),
  title text not null check (char_length(title) between 1 and 700),
  country text check (char_length(country) <= 160),
  region text check (char_length(region) <= 160),
  source_status text check (char_length(source_status) <= 160),
  source_url text not null check (char_length(source_url) <= 900 and source_url ~ '^https://'),
  source_name text not null check (char_length(source_name) <= 160),
  source_date text check (char_length(source_date) <= 60),
  amount_value numeric(24,2),
  amount_currency text check (char_length(amount_currency) <= 10),
  record_code text check (char_length(record_code) <= 120),
  buyer_names text[] not null default '{}'::text[],
  supplier_names text[] not null default '{}'::text[],
  classification text check (char_length(classification) <= 800),
  description text check (char_length(description) <= 3000),
  evidence_level text not null default 'official_source_record',
  status_caveat text check (char_length(status_caveat) <= 500),
  engineering_title_signal boolean not null default false,
  snapshot_id text not null check (char_length(snapshot_id) <= 120),
  imported_at timestamptz not null default now(),
  search_document tsvector generated always as (
    to_tsvector('simple'::regconfig,coalesce(title,'') || ' ' || coalesce(country,'') || ' ' || coalesce(source_name,''))
  ) stored,
  source_excerpt jsonb
);
create index if not exists en_atlas_records_country_kind_idx on public.en_atlas_records(country,record_kind);
create index if not exists en_atlas_records_signal_idx on public.en_atlas_records(engineering_title_signal,country);
create index if not exists en_atlas_records_search_idx on public.en_atlas_records using gin(search_document);
alter table public.en_atlas_records enable row level security;
alter table public.en_atlas_records force row level security;
revoke all on public.en_atlas_records from PUBLIC,anon,authenticated;
grant select on public.en_atlas_records to anon,authenticated;
drop policy if exists en_atlas_records_public_read on public.en_atlas_records;
create policy en_atlas_records_public_read on public.en_atlas_records
for select to anon,authenticated using (true);
comment on table public.en_atlas_records is
  'Licensed public-source snapshot. Not verified job-sites, open tenders, natural-person identity or project membership.';

create table if not exists public.en_atlas_snapshots (
  snapshot_id text primary key,
  expected_count integer not null check (expected_count between 1 and 500000),
  worldbank_count integer not null check (worldbank_count >= 0),
  uk_count integer not null check (uk_count >= 0),
  data_as_of timestamptz not null,
  published_at timestamptz not null default now(),
  source_manifest_sha256 text not null check (source_manifest_sha256 ~ '^[a-f0-9]{64}$'),
  limitations text[] not null default '{}'::text[]
);
alter table public.en_atlas_snapshots enable row level security;
alter table public.en_atlas_snapshots force row level security;
revoke all on public.en_atlas_snapshots from PUBLIC,anon,authenticated;
grant select on public.en_atlas_snapshots to anon,authenticated;
drop policy if exists en_atlas_snapshots_public_read on public.en_atlas_snapshots;
create policy en_atlas_snapshots_public_read on public.en_atlas_snapshots
for select to anon,authenticated using (true);
comment on table public.en_atlas_snapshots is 'Versioned published public-source Atlas dataset with full citation and freshness limitations.';

create table if not exists en_atlas_internal.records_stage (
  like public.en_atlas_records including constraints including defaults including generated including indexes
);
alter table en_atlas_internal.records_stage enable row level security;
alter table en_atlas_internal.records_stage force row level security;
revoke all on table en_atlas_internal.records_stage from PUBLIC,anon,authenticated;
comment on table en_atlas_internal.records_stage is
  'Private source import staging; must be checksum, unique-id and count validated before atomic publication.';
commit;
