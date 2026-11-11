-- Engineering Atlas independent data-source fallback, 2026-11-12.
-- Does not modify SourceRating users, projects, rooms or published en_atlas_records.
-- Candidates stay PRIVATE pending review. Only administrator/cron executes sync.
begin;
create schema if not exists en_atlas_internal;
revoke all on schema en_atlas_internal from PUBLIC, anon, authenticated;
create extension if not exists http with schema extensions;

create table if not exists public.en_atlas_refresh_candidates (
 candidate_id text primary key check (char_length(candidate_id) between 12 and 120),
 source_name text not null check (source_name in ('UK Contracts Finder','World Bank Projects & Operations')),
 source_url text not null check (char_length(source_url)<=900 and source_url ~ '^https://'),
 record_title text not null check (char_length(record_title) between 3 and 700),
 source_status text check (char_length(source_status)<=120),
 source_published_at timestamptz,
 item_sha256 text not null check (item_sha256 ~ '^[a-f0-9]{64}$'),
 candidate_data jsonb not null check (jsonb_typeof(candidate_data)='object' and octet_length(candidate_data::text)<=12000),
 observed_at timestamptz not null default now(),
 review_state text not null default 'pending' check (review_state in ('pending','accepted','rejected')),
 update_count integer not null default 1
);
create index if not exists en_atlas_refresh_pending_idx on public.en_atlas_refresh_candidates(review_state,observed_at desc);
alter table public.en_atlas_refresh_candidates enable row level security;
alter table public.en_atlas_refresh_candidates force row level security;
revoke all on public.en_atlas_refresh_candidates from PUBLIC,anon,authenticated;
comment on table public.en_atlas_refresh_candidates is 'Private pending-review data, never automatically displayed or promoted to en_atlas_records.';

create table if not exists public.en_atlas_refresh_runs (
 run_id text primary key check (char_length(run_id) between 4 and 150),
 origin text not null default 'github-actions',
 status text not null default 'received' check (status in ('received','succeeded','failed')),
 received_count integer not null default 0,
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 error_code text check (char_length(error_code)<=90)
);
alter table public.en_atlas_refresh_runs enable row level security;
alter table public.en_atlas_refresh_runs force row level security;
revoke all on public.en_atlas_refresh_runs from PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION en_atlas_internal.refresh_uk_candidates()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'extensions', 'en_atlas_internal'
AS $function$
declare
  prefix constant text := 'https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?';
  current_url text;
  from_time text;
  to_time text;
  payload text;
  status_code integer;
  doc jsonb;
  notice jsonb;
  tag_list jsonb;
  info jsonb;
  notice_id text;
  name text;
  category text;
  cpv text;
  published text;
  result_url text;
  key text;
  scanned integer := 0;
  candidates integer := 0;
  pages integer := 0;
begin
  -- This no-argument function is only callable via postgres-owned cron or SQL administration.
  -- Never use input URLs or access user records.
  perform set_config('http.curlopt_timeout_ms','23000',true);
  from_time := to_char((now()-interval '3 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  to_time := to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  current_url := prefix||'publishedFrom='||from_time||'&publishedTo='||to_time||'&limit=100';
  for p in 1..4 loop
    if current_url is null or current_url not like prefix||'%' or length(current_url)>1500 then
      raise exception 'Untrusted upstream pagination';
    end if;
    select h.status,h.content into status_code,payload from extensions.http_get(current_url) h;
    if status_code<>200 or length(payload)>5000000 then
      raise exception 'Official source request unavailable, status %, bytes %',status_code,length(payload);
    end if;
    doc := payload::jsonb;
    if jsonb_typeof(doc->'releases')<>'array' then raise exception 'Official OCDS response missing releases array';end if;
    pages := pages+1;
    for notice in select value from jsonb_array_elements(doc->'releases') value loop
      scanned := scanned+1;
      notice_id := notice->>'id';
      if notice_id is null or notice_id !~ '^[A-Za-z0-9-]{5,100}$' then continue;end if;
      name := left(btrim(coalesce(notice#>>'{tender,title}','')),700);
      if length(name)<3 then continue;end if;
      category := lower(coalesce(notice#>>'{tender,mainProcurementCategory}',''));
      cpv := coalesce(notice#>>'{tender,classification,id}','');
      if not (
         category='works'
         or cpv ~ '^(44|45|71)'
         or name ~* '(construction|civil engineering|geotechnical|bridge|highway|roadwork|railway|tunnel|dam|power station|structural|foundation|piling|pile testing|concrete|prefab|precast|roof|refurbish|water treatment|drainage|building work|survey|asbestos remov|infrastructure)'
      ) then continue;end if;
      published := notice->>'date';
      if published is null or published !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}T' then continue;end if;
      tag_list := case when jsonb_typeof(notice->'tag')='array' then notice->'tag' else '[]'::jsonb end;
      info := jsonb_build_object(
         'source','UK Contracts Finder',
         'notice_id',notice_id,
         'ocid',left(coalesce(notice->>'ocid',''),140),
         'title',name,
         'tags',tag_list,
         'classification',left(cpv,50),
         'mainProcurementCategory',left(category,35),
         'sourcePublishedAt',published,
         'disclaimer','Official notice; award is not proof of contract execution, and records are not verified job-sites.'
      );
      if octet_length(info::text)>11000 then continue;end if;
      key := 'uk:'||substr(encode(sha256(convert_to(notice_id,'UTF8')),'hex'),1,24);
      result_url := 'https://www.contractsfinder.service.gov.uk/Published/Notice/releases/'||notice_id||'.json';
      insert into public.en_atlas_refresh_candidates(
        candidate_id,source_name,source_url,record_title,source_status,source_published_at,item_sha256,
        candidate_data,observed_at,review_state
      )
      values (
        key,'UK Contracts Finder',result_url,name,
        left(trim(both ' "' from tag_list::text),120),
        published::timestamptz,
        encode(sha256(convert_to(info::text,'UTF8')),'hex'),
        info,now(),'pending'
      )
      on conflict(candidate_id) do update set
         source_status=excluded.source_status,
         source_published_at=excluded.source_published_at,
         candidate_data=excluded.candidate_data,
         item_sha256=excluded.item_sha256,
         observed_at=now(),
         update_count=public.en_atlas_refresh_candidates.update_count+1,
         review_state=case
          when public.en_atlas_refresh_candidates.source_published_at is distinct from excluded.source_published_at
          then 'pending'
          else public.en_atlas_refresh_candidates.review_state
         end;
      candidates := candidates+1;
      exit when candidates>=100;
    end loop;
    exit when candidates>=100;
    current_url := doc#>>'{links,next}';
    exit when current_url is null or current_url='';
  end loop;
  insert into public.en_atlas_refresh_runs(run_id,origin,status,received_count,finished_at)
  values ('pgcron-'||to_char(now() at time zone 'UTC','YYYYMMDDHH24MI'),'supabase-pgcron','succeeded',candidates,now())
  on conflict(run_id) do update set status='succeeded',received_count=excluded.received_count,finished_at=now();
  return jsonb_build_object('pages',pages,'scanned',scanned,'staged_or_refreshed',candidates,'published_untouched',true);
end;$function$
;

revoke all on function en_atlas_internal.refresh_uk_candidates() from PUBLIC,anon,authenticated;
-- Cron only polls official API and writes isolated private staging. No production publishing.
select cron.schedule(
  'en_atlas_uk_refresh_standby_20261112',
  '47 2 * * *',
  'select en_atlas_internal.refresh_uk_candidates();'
);
commit;
