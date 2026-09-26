-- P1.5 durable asynchronous agent runtime.
-- Chat remains fully independent. This worker only consumes persisted outbox rows.

create table if not exists public.staging_proposals (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  source_event_id uuid not null references public.room_events(id) on delete cascade,
  proposal_type text not null check (
    proposal_type in (
      'requirement',
      'quote_change',
      'decision',
      'question',
      'risk',
      'file_update',
      'general'
    )
  ),
  payload jsonb not null default '{}'::jsonb,
  confidence numeric(5,4) not null default 0 check (confidence >= 0 and confidence <= 1),
  provider text not null default 'rules',
  status text not null default 'pending' check (
    status in ('pending','accepted','dismissed','superseded')
  ),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_user_id uuid references auth.users(id) on delete set null,
  reviewed_by_organization_id uuid references public.organizations(id) on delete set null,
  unique (source_event_id, proposal_type, provider)
);

create index if not exists staging_proposals_room_status_idx
  on public.staging_proposals(room_id, status, created_at desc);

create table if not exists public.needs_you (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  source_event_id uuid references public.room_events(id) on delete cascade,
  proposal_id uuid references public.staging_proposals(id) on delete cascade,
  title text not null,
  detail text,
  priority text not null default 'normal' check (
    priority in ('low','normal','high','critical')
  ),
  status text not null default 'open' check (
    status in ('open','done','dismissed')
  ),
  target_organization_id uuid references public.organizations(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by_user_id uuid references auth.users(id) on delete set null
);

create index if not exists needs_you_room_open_idx
  on public.needs_you(room_id, status, priority, created_at desc);

create table if not exists public.canonical_objects (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  object_type text not null,
  payload jsonb not null default '{}'::jsonb,
  source_event_id uuid not null references public.room_events(id) on delete restrict,
  accepted_proposal_id uuid not null references public.staging_proposals(id) on delete restrict,
  version_no integer not null default 1 check (version_no >= 1),
  status text not null default 'active' check (status in ('active','superseded','withdrawn')),
  committed_by_user_id uuid not null references auth.users(id) on delete restrict,
  committed_by_organization_id uuid not null references public.organizations(id) on delete restrict,
  committed_at timestamptz not null default now(),
  unique (accepted_proposal_id)
);

create index if not exists canonical_objects_room_type_idx
  on public.canonical_objects(room_id, object_type, committed_at desc);

alter table public.staging_proposals enable row level security;
alter table public.needs_you enable row level security;
alter table public.canonical_objects enable row level security;

drop policy if exists staging_proposals_select on public.staging_proposals;
create policy staging_proposals_select
on public.staging_proposals
for select
to authenticated
using (public.is_room_member(room_id));

drop policy if exists needs_you_select on public.needs_you;
create policy needs_you_select
on public.needs_you
for select
to authenticated
using (public.is_room_member(room_id));

drop policy if exists canonical_objects_select on public.canonical_objects;
create policy canonical_objects_select
on public.canonical_objects
for select
to authenticated
using (public.is_room_member(room_id));

-- Agent-only outbox claimant. Authenticated clients cannot call it.
create or replace function public.agent_claim_outbox(p_limit integer default 20)
returns setof public.event_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user not in ('service_role', 'postgres') then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  return query
  with claim as (
    select o.id
    from public.event_outbox o
    where o.status in ('pending','failed')
      and o.available_at <= now()
      and (o.locked_at is null or o.locked_at < now() - interval '10 minutes')
      and o.attempts < 10
    order by o.id
    for update skip locked
    limit greatest(1, least(coalesce(p_limit,20),100))
  )
  update public.event_outbox o
  set status = 'processing',
      attempts = o.attempts + 1,
      locked_at = now(),
      last_error = null
  from claim
  where o.id = claim.id
  returning o.*;
end;
$$;

revoke all on function public.agent_claim_outbox(integer) from public, anon, authenticated;

create or replace function public.agent_complete_outbox(
  p_id bigint,
  p_success boolean,
  p_error text default null,
  p_retry_seconds integer default 60
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user not in ('service_role', 'postgres') then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  if p_success then
    update public.event_outbox
    set status = 'delivered',
        delivered_at = now(),
        locked_at = null,
        last_error = null
    where id = p_id;
  else
    update public.event_outbox
    set status = case when attempts >= 10 then 'failed' else 'failed' end,
        available_at = now() + make_interval(secs => greatest(5, least(coalesce(p_retry_seconds,60),3600))),
        locked_at = null,
        last_error = left(coalesce(p_error,'agent_worker_failed'),2000)
    where id = p_id;
  end if;
end;
$$;

revoke all on function public.agent_complete_outbox(bigint,boolean,text,integer)
  from public, anon, authenticated;

create or replace function public.review_staging_proposal(
  p_proposal_id uuid,
  p_action text,
  p_actor_organization_id uuid,
  p_payload_override jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.staging_proposals;
  v_payload jsonb;
  v_object public.canonical_objects;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if p_action not in ('accept','dismiss') then
    raise exception 'invalid_review_action';
  end if;

  select * into v_proposal
  from public.staging_proposals
  where id = p_proposal_id
  for update;

  if not found then
    raise exception 'proposal_not_found';
  end if;

  if not public.is_room_member(v_proposal.room_id) then
    raise exception 'room_access_denied' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.room_members rm
    where rm.room_id = v_proposal.room_id
      and rm.user_id = auth.uid()
      and rm.acting_organization_id = p_actor_organization_id
      and rm.removed_at is null
  ) then
    raise exception 'acting_org_not_bound_to_room' using errcode = '42501';
  end if;

  if v_proposal.status <> 'pending' then
    return jsonb_build_object(
      'proposal', to_jsonb(v_proposal),
      'idempotent', true
    );
  end if;

  if p_action = 'dismiss' then
    update public.staging_proposals
    set status='dismissed',
        reviewed_at=now(),
        reviewed_by_user_id=auth.uid(),
        reviewed_by_organization_id=p_actor_organization_id
    where id=v_proposal.id
    returning * into v_proposal;

    update public.needs_you
    set status='dismissed',
        resolved_at=now(),
        resolved_by_user_id=auth.uid()
    where proposal_id=v_proposal.id and status='open';

    insert into public.audit_log(
      actor_user_id, actor_organization_id, room_id,
      action, target_type, target_id, metadata
    )
    values(
      auth.uid(), p_actor_organization_id, v_proposal.room_id,
      'staging_proposal.dismissed', 'staging_proposal', v_proposal.id::text, '{}'::jsonb
    );

    return jsonb_build_object('proposal',to_jsonb(v_proposal),'idempotent',false);
  end if;

  v_payload := coalesce(p_payload_override, v_proposal.payload);

  update public.staging_proposals
  set status='accepted',
      payload=v_payload,
      reviewed_at=now(),
      reviewed_by_user_id=auth.uid(),
      reviewed_by_organization_id=p_actor_organization_id
  where id=v_proposal.id
  returning * into v_proposal;

  insert into public.canonical_objects(
    room_id, object_type, payload, source_event_id, accepted_proposal_id,
    version_no, committed_by_user_id, committed_by_organization_id
  )
  values(
    v_proposal.room_id,
    v_proposal.proposal_type,
    v_payload,
    v_proposal.source_event_id,
    v_proposal.id,
    1,
    auth.uid(),
    p_actor_organization_id
  )
  on conflict (accepted_proposal_id) do nothing
  returning * into v_object;

  if v_object.id is null then
    select * into v_object
    from public.canonical_objects
    where accepted_proposal_id=v_proposal.id;
  end if;

  update public.needs_you
  set status='done',
      resolved_at=now(),
      resolved_by_user_id=auth.uid()
  where proposal_id=v_proposal.id and status='open';

  insert into public.audit_log(
    actor_user_id, actor_organization_id, room_id,
    action, target_type, target_id, metadata
  )
  values(
    auth.uid(), p_actor_organization_id, v_proposal.room_id,
    'staging_proposal.accepted', 'canonical_object', v_object.id::text,
    jsonb_build_object('proposal_id',v_proposal.id)
  );

  return jsonb_build_object(
    'proposal',to_jsonb(v_proposal),
    'canonical_object',to_jsonb(v_object),
    'idempotent',false
  );
end;
$$;

revoke all on function public.review_staging_proposal(uuid,text,uuid,jsonb)
  from public, anon;
grant execute on function public.review_staging_proposal(uuid,text,uuid,jsonb)
  to authenticated;