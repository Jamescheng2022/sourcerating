-- Persist attempt limits across Edge workers/restarts. Global peer-IP and
-- per-token counters count every bootstrap attempt, not only new accounts.
alter table public.project_invites
  add column bootstrap_attempt_count smallint not null default 0 check (bootstrap_attempt_count between 0 and 13),
  add column bootstrap_window_started_at timestamptz not null default now();
create schema sourcerating_private;
revoke all on schema sourcerating_private from public, anon, authenticated;
create table sourcerating_private.invite_bootstrap_peer_limits (
  peer_hash text primary key check (peer_hash ~ '^[0-9a-f]{64}$'),
  attempt_count smallint not null check (attempt_count between 0 and 61),
  window_started_at timestamptz not null
);
alter table sourcerating_private.invite_bootstrap_peer_limits enable row level security;
revoke all on sourcerating_private.invite_bootstrap_peer_limits from public, anon, authenticated, service_role;

create function public.consume_invite_bootstrap_attempt(p_invite_id uuid, p_peer_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_invite public.project_invites;
  v_peer_count smallint;
  v_now timestamptz := now();
begin
  if p_peer_hash is null or p_peer_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_peer_hash' using errcode = '22023';
  end if;
  select * into v_invite from public.project_invites where id = p_invite_id for update;
  if not found or v_invite.used_at is not null or v_invite.revoked_at is not null or v_invite.expires_at <= v_now then
    return false;
  end if;
  update public.project_invites
  set bootstrap_attempt_count = case
        when bootstrap_window_started_at <= v_now - interval '10 minutes' then 1
        else least(13, bootstrap_attempt_count + 1) end,
      bootstrap_window_started_at = case
        when bootstrap_window_started_at <= v_now - interval '10 minutes' then v_now
        else bootstrap_window_started_at end
  where id = p_invite_id returning * into v_invite;
  insert into sourcerating_private.invite_bootstrap_peer_limits as limits(peer_hash, attempt_count, window_started_at)
  values (p_peer_hash, 1, v_now)
  on conflict (peer_hash) do update
  set attempt_count = case
        when limits.window_started_at <= v_now - interval '10 minutes' then 1
        else least(61, limits.attempt_count + 1) end,
      window_started_at = case
        when limits.window_started_at <= v_now - interval '10 minutes' then v_now
        else limits.window_started_at end
  returning attempt_count into v_peer_count;
  return v_invite.bootstrap_attempt_count <= 12 and v_peer_count <= 60;
end;
$$;
revoke all on function public.consume_invite_bootstrap_attempt(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_invite_bootstrap_attempt(uuid, text) to service_role;
