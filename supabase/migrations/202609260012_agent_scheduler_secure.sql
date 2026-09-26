-- P1.5 resident agent scheduler with custom shared secret.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.agent_runtime_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into private.agent_runtime_config(key,value)
values
  ('worker_url','https://qnozpurjtgkmwtvsrjoi.supabase.co/functions/v1/source-rating-agent-worker'),
  ('worker_secret',encode(gen_random_bytes(32),'hex'))
on conflict (key) do nothing;

create or replace function public.validate_source_rating_agent_secret(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = private, public, extensions
as $$
  select exists (
    select 1
    from private.agent_runtime_config c
    where c.key='worker_secret'
      and encode(
            digest(convert_to(p_secret,'UTF8'),'sha256'),
            'hex'
          )
          =
          encode(
            digest(convert_to(c.value,'UTF8'),'sha256'),
            'hex'
          )
  );
$$;

revoke all on function public.validate_source_rating_agent_secret(text) from public;
grant execute on function public.validate_source_rating_agent_secret(text) to anon, authenticated;

create schema if not exists util;
revoke all on schema util from public, anon, authenticated;

create or replace function util.invoke_source_rating_agent_worker()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select value into v_url
  from private.agent_runtime_config
  where key='worker_url';

  select value into v_secret
  from private.agent_runtime_config
  where key='worker_secret';

  if v_url is null or v_secret is null then
    raise exception 'agent_runtime_config_missing';
  end if;

  perform net.http_post(
    url => v_url,
    headers => jsonb_build_object(
      'Content-Type','application/json',
      'x-source-rating-agent-secret',v_secret
    ),
    body => '{}'::jsonb,
    timeout_milliseconds => 25000
  );
end;
$$;

revoke all on function util.invoke_source_rating_agent_worker() from public, anon, authenticated;

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname='source-rating-agent-minute';

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'source-rating-agent-minute',
    '* * * * *',
    'select util.invoke_source_rating_agent_worker();'
  );
end $$;