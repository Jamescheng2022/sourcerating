-- Reserve an unbound account-creation attempt before touching Auth. Failed or
-- existing-email attempts consume the reservation too: never refund a slot
-- based on email existence. This fails closed after an uncertain Auth outcome.
alter table public.project_invites add column unbound_bootstrap_reservations smallint not null default 0
  check (unbound_bootstrap_reservations between 0 and 3);
update public.project_invites i
set unbound_bootstrap_reservations = least(3, (
  select count(*) from public.audit_log a
  where a.action = 'project_invite.account_bootstrapped' and a.target_id = i.id::text
))
where i.invited_email is null;

create function public.reserve_invite_bootstrap(p_invite_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.project_invites i
  set unbound_bootstrap_reservations = i.unbound_bootstrap_reservations + 1
  where i.id = p_invite_id and i.invited_email is null
    and i.unbound_bootstrap_reservations < 3
    and i.used_at is null and i.revoked_at is null and i.expires_at > now();
  if found then return true; end if;
  return exists (
    select 1 from public.project_invites i where i.id = p_invite_id
      and i.invited_email is not null and i.used_at is null and i.revoked_at is null and i.expires_at > now()
  );
end;
$$;
revoke all on function public.reserve_invite_bootstrap(uuid) from public, anon, authenticated;
grant execute on function public.reserve_invite_bootstrap(uuid) to service_role;
