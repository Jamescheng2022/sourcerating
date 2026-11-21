-- PostgREST v14 sets verified JWT claims as JSON; the legacy per-claim GUC is absent.
-- Keep the service-role-only privilege and strict room allowlist checks.
-- Stage2 / pilot only: review before applying to an isolated synthetic tenant.
-- This migration must not run on customer/production projects.
create or replace function public.agent_claim_scoped_outbox(
  p_allowed_room_ids uuid[],
  p_limit integer default 5
)
returns setof public.event_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb ->> 'role','') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_allowed_room_ids is null or array_length(p_allowed_room_ids,1) is null
     or array_length(p_allowed_room_ids,1) > 50 then
    raise exception 'scoped_room_ids_required' using errcode = '22023';
  end if;
  return query
  with claim as (
    select o.id from public.event_outbox o
    where o.room_id = any(p_allowed_room_ids)
      and o.status in ('pending','failed')
      and o.available_at <= now()
      and (o.locked_at is null or o.locked_at < now() - interval '10 minutes')
      and o.attempts < 10
    order by o.id
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,5),5))
  )
  update public.event_outbox o
  set status='processing', attempts=o.attempts+1,
      locked_at=now(), last_error=null
  from claim where o.id=claim.id returning o.*;
end;
$$;

revoke all on function public.agent_claim_scoped_outbox(uuid[],integer)
  from public, anon, authenticated;
grant execute on function public.agent_claim_scoped_outbox(uuid[],integer) to service_role;

