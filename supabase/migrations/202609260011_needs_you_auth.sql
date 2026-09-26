-- P1.5 Needs You privacy and review authorization.

drop policy if exists needs_you_select on public.needs_you;
create policy needs_you_select
on public.needs_you
for select
to authenticated
using (
  public.is_room_member(room_id)
  and (
    target_organization_id is null
    or public.is_org_member(target_organization_id)
  )
);

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
  v_target_organization_id uuid;
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

  select n.target_organization_id
  into v_target_organization_id
  from public.needs_you n
  where n.proposal_id = v_proposal.id
    and n.status = 'open'
  order by n.created_at
  limit 1;

  if v_target_organization_id is not null
     and not public.is_org_member(v_target_organization_id) then
    raise exception 'proposal_review_not_assigned_to_your_organization'
      using errcode = '42501';
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