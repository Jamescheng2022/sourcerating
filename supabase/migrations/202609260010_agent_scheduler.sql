-- P1.5 resident worker scheduler primitives.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create schema if not exists util;

create or replace function util.invoke_source_rating_agent_worker()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_url text;
  v_anon_jwt text;
begin
  select decrypted_secret
  into v_project_url
  from vault.decrypted_secrets
  where name = 'sourcerating_project_url'
  limit 1;

  select decrypted_secret
  into v_anon_jwt
  from vault.decrypted_secrets
  where name = 'sourcerating_anon_jwt'
  limit 1;

  if v_project_url is null or v_anon_jwt is null then
    raise exception 'source_rating_agent_scheduler_secrets_missing';
  end if;

  perform net.http_post(
    url => v_project_url || '/functions/v1/source-rating-agent-worker',
    headers => jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || v_anon_jwt
    ),
    body => '{}'::jsonb,
    timeout_milliseconds => 25000
  );
end;
$$;

revoke all on function util.invoke_source_rating_agent_worker() from public, anon, authenticated;
