-- TEST ONLY: minimal emulation for isolated, loopback PostgreSQL.
-- This is not Supabase Auth, Storage, pg_net, pg_cron, or a production schema.
create schema if not exists extensions;
create schema if not exists auth;
create schema if not exists storage;
create schema if not exists cron;
create schema if not exists net;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create table auth.users(id uuid primary key, email text);
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb
$$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt()->>'sub','')::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select auth.jwt()->>'role'
$$;
grant usage on schema auth,storage to anon,authenticated,service_role;
create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text not null, owner uuid, owner_id text, metadata jsonb, unique(bucket_id,name));
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name,'/'))[1:greatest(array_length(string_to_array(name,'/'),1)-1,0)]
$$;
create function storage.filename(name text) returns text language sql immutable as $$
  select (string_to_array(name,'/'))[array_length(string_to_array(name,'/'),1)]
$$;
create table cron.job(jobid bigint, jobname text);
create function cron.unschedule(bigint) returns boolean language sql as $$ select true $$;
create function cron.schedule(text,text,text) returns bigint language sql as $$ select 1::bigint $$;
create function net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds integer) returns bigint language plpgsql as $$ begin raise exception 'test_shim_http_disabled'; end $$;
create publication supabase_realtime;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
