-- Replay records are private, retained evidence; no cleanup/deletion job.
create table sourcerating_private.invite_relay_nonces (
  project_ref text not null check (project_ref in ('fzrberkeoizarduwuisp', 'sourcerating-l1-stage2')),
  nonce_hash text not null check (nonce_hash ~ '^[0-9a-f]{64}$'),
  accepted_at timestamptz not null default now(),
  primary key (project_ref, nonce_hash)
);
alter table sourcerating_private.invite_relay_nonces enable row level security;
revoke all on sourcerating_private.invite_relay_nonces from public, anon, authenticated, service_role;

-- MAC verification precedes this service-only call. Unique insertion serializes
-- simultaneous replay across isolates and persists through function restarts.
create function public.consume_invite_relay_nonce(p_project_ref text, p_nonce_hash text, p_timestamp bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_rows integer;
begin
  if p_project_ref not in ('fzrberkeoizarduwuisp', 'sourcerating-l1-stage2')
    or p_project_ref is null or p_nonce_hash is null or p_nonce_hash !~ '^[0-9a-f]{64}$'
    or p_timestamp is null or abs(extract(epoch from clock_timestamp()) - p_timestamp) > 60 then
    return false;
  end if;
  insert into sourcerating_private.invite_relay_nonces(project_ref, nonce_hash)
  values (p_project_ref, p_nonce_hash) on conflict do nothing;
  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;
revoke all on function public.consume_invite_relay_nonce(text,text,bigint) from public, anon, authenticated;
grant execute on function public.consume_invite_relay_nonce(text,text,bigint) to service_role;
