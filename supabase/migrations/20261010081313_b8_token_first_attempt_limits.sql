-- Spend the token budget first. A denied token never drains another client's
-- peer budget, even when many requests arrive concurrently behind one proxy.
create or replace function public.consume_invite_bootstrap_attempt(p_invite_id uuid, p_peer_hash text)
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
  if not found or v_invite.invited_email is null or v_invite.used_at is not null
    or v_invite.revoked_at is not null or v_invite.expires_at <= v_now then return false; end if;
  if v_invite.bootstrap_window_started_at > v_now - interval '10 minutes'
    and v_invite.bootstrap_attempt_count >= 12 then return false; end if;
  update public.project_invites
  set bootstrap_attempt_count = case when bootstrap_window_started_at <= v_now - interval '10 minutes' then 1
      else bootstrap_attempt_count + 1 end,
    bootstrap_window_started_at = case when bootstrap_window_started_at <= v_now - interval '10 minutes' then v_now
      else bootstrap_window_started_at end
  where id = p_invite_id;
  insert into sourcerating_private.invite_bootstrap_peer_limits as limits(peer_hash, attempt_count, window_started_at)
  values (p_peer_hash, 1, v_now)
  on conflict (peer_hash) do update
  set attempt_count = case when limits.window_started_at <= v_now - interval '10 minutes' then 1
      else least(61, limits.attempt_count + 1) end,
    window_started_at = case when limits.window_started_at <= v_now - interval '10 minutes' then v_now
      else limits.window_started_at end
  returning attempt_count into v_peer_count;
  return v_peer_count <= 60;
end;
$$;
revoke all on function public.consume_invite_bootstrap_attempt(uuid,text) from public, anon, authenticated;
grant execute on function public.consume_invite_bootstrap_attempt(uuid,text) to service_role;
