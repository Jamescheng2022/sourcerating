-- SourceRating / Engineering Atlas: source-declared buyers and awarded suppliers.
-- These are public-data mentions, NOT verified legal entities, employees,
-- verified project participants, claimed accounts or live purchase leads.
begin;
create table if not exists public.en_atlas_org_mentions (
  mention_key text primary key check (char_length(mention_key) = 32),
  record_id text not null references public.en_atlas_records(record_id) on delete cascade,
  role text not null check (role in ('source_declared_buyer','source_declared_awarded_supplier')),
  organization_name text not null check (char_length(organization_name) between 1 and 250),
  source_organization_id text check (char_length(source_organization_id) <= 180),
  snapshot_id text not null,
  evidence_level text not null default 'source_declared',
  created_at timestamptz not null default now()
);
create index if not exists en_atlas_mentions_org_idx on public.en_atlas_org_mentions(organization_name);
create index if not exists en_atlas_mentions_record_role_idx on public.en_atlas_org_mentions(record_id,role);
alter table public.en_atlas_org_mentions enable row level security;
alter table public.en_atlas_org_mentions force row level security;
revoke all on public.en_atlas_org_mentions from PUBLIC,anon,authenticated;
grant select on public.en_atlas_org_mentions to anon,authenticated;
drop policy if exists en_atlas_org_mentions_read on public.en_atlas_org_mentions;
create policy en_atlas_org_mentions_read on public.en_atlas_org_mentions
 for select to anon,authenticated using (true);
comment on table public.en_atlas_org_mentions is
 'Source-declared organization mentions in procurement notices; not verified company identities or contracted construction work.';

with mentions as (
  select r.record_id,r.snapshot_id,'source_declared_buyer'::text as role,
    left(trim(b->>'name'),250) as name,nullif(left(b->>'id',180),'') as org_id
  from public.en_atlas_records r
  cross join lateral jsonb_array_elements(coalesce(r.source_excerpt->'buyers','[]'::jsonb)) b
  where r.record_kind='uk_procurement_notice' and nullif(trim(b->>'name'),'') is not null
  union all
  select r.record_id,r.snapshot_id,'source_declared_awarded_supplier',
    left(trim(s->>'name'),250),nullif(left(s->>'id',180),'')
  from public.en_atlas_records r
  cross join lateral jsonb_array_elements(coalesce(r.source_excerpt->'awards','[]'::jsonb)) a
  cross join lateral jsonb_array_elements(coalesce(a->'suppliers','[]'::jsonb)) s
  where r.record_kind='uk_procurement_notice' and nullif(trim(s->>'name'),'') is not null
), dedup as (
  select distinct on (mention_key) mention_key,record_id,role,name,org_id,snapshot_id
  from (
    select md5(record_id||'|'||role||'|'||coalesce(org_id,'')||'|'||lower(name)) as mention_key,
           record_id,role,name,org_id,snapshot_id from mentions
  ) a order by mention_key,record_id
)
insert into public.en_atlas_org_mentions(mention_key,record_id,role,organization_name,source_organization_id,snapshot_id)
select mention_key,record_id,role,name,org_id,snapshot_id from dedup
on conflict (mention_key) do nothing;
commit;
