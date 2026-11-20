-- 202611230002_p1_timeline_projection.sql
-- Phase 1 - Week 1: Timeline Projection, Redaction RPC, and Audience Confirmation
set local lock_timeout = '3s';

-- 1. Derived projection table for message lifecycle state (redactions, edits)
create table if not exists public.room_message_projection (
  event_id            uuid primary key references public.room_events(id) on delete cascade,
  room_id             uuid not null references public.rooms(id) on delete restrict,
  redaction_event_id  uuid references public.room_events(id) on delete restrict,
  redacted_at         timestamptz,
  redacted_by         uuid references auth.users(id) on delete set null,
  last_edit_event_id  uuid references public.room_events(id) on delete restrict,
  created_at          timestamptz not null default clock_timestamp()
);

create index if not exists room_msg_proj_room_idx on public.room_message_projection(room_id, event_id);

alter table public.room_message_projection enable row level security;
alter table public.room_message_projection force row level security;

drop policy if exists room_msg_proj_select on public.room_message_projection;
create policy room_msg_proj_select on public.room_message_projection
  for select to authenticated
  using (public.is_room_member(room_id));

revoke all on public.room_message_projection from public, anon;
grant select on public.room_message_projection to authenticated;
grant all on public.room_message_projection to postgres, service_role;

-- 2. Snapshot of audience read state at redaction time
create or replace function public.sr_room_read_snapshot(p_room_id uuid, p_seq bigint)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_res jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not public.is_room_member(p_room_id) then raise exception 'room_access_denied' using errcode = '42501'; end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'organization_id', o.org_id,
        'organization_name', o.org_name,
        'total_members', o.total_cnt,
        'read_members', o.read_cnt
      )
    ),
    '[]'::jsonb
  ) into v_res
  from (
    select
      rm.acting_organization_id as org_id,
      coalesce(org.name, 'Unknown') as org_name,
      count(*)::int as total_cnt,
      count(*) filter (where rm.last_read_seq >= p_seq)::int as read_cnt
    from public.room_members rm
    join public.organizations org on org.id = rm.acting_organization_id
    where rm.room_id = p_room_id and rm.removed_at is null
    group by rm.acting_organization_id, org.name
  ) o;

  return v_res;
end;
$$;

revoke all on function public.sr_room_read_snapshot(uuid, bigint) from public, anon;
grant execute on function public.sr_room_read_snapshot(uuid, bigint) to authenticated, postgres, service_role;

-- 3. Redact message RPC
create or replace function public.sr_redact_message(
  p_room_id uuid,
  p_message_event_id uuid,
  p_actor_organization_id uuid,
  p_client_msg_id uuid,
  p_reason_code text,          -- wrong_recipient | wrong_content | sensitive_data | duplicate | other
  p_reason_note text default null
)
returns public.room_events
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_target public.room_events;
  v_role text;
  v_ev public.room_events;
  v_read jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  v_role := public.sr_room_role(p_room_id, p_actor_organization_id);
  if v_role is null or v_role = 'viewer' then raise exception 'room_write_denied' using errcode = '42501'; end if;
  if p_reason_code not in ('wrong_recipient', 'wrong_content', 'sensitive_data', 'duplicate', 'other') then
    raise exception 'invalid_reason_code' using errcode = '22023';
  end if;

  select * into v_target from public.room_events
   where id = p_message_event_id and room_id = p_room_id and event_type = 'message.posted'
   for share;
  if not found then raise exception 'message_not_found' using errcode = '22023'; end if;

  -- Idempotent check: if already redacted, return existing redaction event
  select e.* into v_ev from public.room_message_projection p
    join public.room_events e on e.id = p.redaction_event_id
   where p.event_id = v_target.id;
  if found then return v_ev; end if;

  -- Authority check: Sender within 24h OR sender org owner/admin
  if not (
    (v_target.actor_user_id = auth.uid() and v_target.actor_organization_id = p_actor_organization_id
     and v_target.created_at > clock_timestamp() - interval '24 hours')
    or
    (v_target.actor_organization_id = p_actor_organization_id
     and coalesce(public.sr_org_role(p_actor_organization_id), '') in ('owner', 'admin'))
  ) then
    raise exception 'redaction_not_permitted' using errcode = '42501';
  end if;

  -- Block redaction if referenced by binding confirmation or proposal
  if exists (
    select 1 from public.room_events c
     where c.room_id = p_room_id
       and c.event_type in ('confirmation.recorded', 'proposal.created', 'bid.sealed')
       and c.payload @> jsonb_build_object('source_event_ids', jsonb_build_array(v_target.id::text))
  ) then
    raise exception 'redaction_blocked_by_commitment' using errcode = '42501';
  end if;

  v_read := public.sr_room_read_snapshot(p_room_id, v_target.seq);

  v_ev := public.append_room_event(
    p_room_id,
    p_client_msg_id,
    p_actor_organization_id,
    'message.redacted',
    jsonb_build_object(
      'target_event_id', v_target.id,
      'target_seq', v_target.seq,
      'target_content_hash', v_target.content_hash,
      'reason_code', p_reason_code,
      'reason_note', public.sr_clean_name(p_reason_note, 200),
      'audience_read_at_redaction', v_read
    )
  );

  insert into public.room_message_projection (event_id, room_id, redaction_event_id, redacted_at, redacted_by)
  values (v_target.id, p_room_id, v_ev.id, v_ev.created_at, auth.uid())
  on conflict (event_id) do update
    set redaction_event_id = excluded.redaction_event_id,
        redacted_at = excluded.redacted_at,
        redacted_by = excluded.redacted_by;

  return v_ev;
end;
$$;

revoke all on function public.sr_redact_message(uuid, uuid, uuid, uuid, text, text) from public, anon;
grant execute on function public.sr_redact_message(uuid, uuid, uuid, uuid, text, text) to authenticated;

-- 4. Harden organization member removal to cascade to room memberships and synchronize effective audience
create or replace function public.sr_remove_org_member(p_organization_id uuid, p_user_id uuid)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null or coalesce(public.sr_org_role(p_organization_id), '') not in ('owner','admin') then
    raise exception 'organization_admin_required' using errcode = '42501';
  end if;
  if exists (select 1 from public.organization_memberships
              where organization_id = p_organization_id and user_id = p_user_id and role = 'owner') then
    raise exception 'owner_cannot_be_removed' using errcode = '42501';
  end if;

  -- Acquire lock on the organization and associated commercial parent rooms to serialize with audience confirmation
  -- Follow global lock hierarchy: 1. organizations (order by id), 2. rooms (order by id)
  perform 1 from public.organizations where id = p_organization_id order by id for update;
  perform 1 from public.rooms where id in (
    select distinct coalesce(r.parent_room_id, r.id)
    from public.rooms r
    join public.room_members rm on rm.room_id = r.id
    where rm.acting_organization_id = p_organization_id and rm.removed_at is null
  ) order by id for update;

  update public.organization_memberships set removed_at = clock_timestamp()
   where organization_id = p_organization_id and user_id = p_user_id and removed_at is null;

  update public.room_members set removed_at = clock_timestamp()
   where acting_organization_id = p_organization_id and user_id = p_user_id and removed_at is null;

  insert into public.audit_log(actor_user_id, actor_organization_id, action, target_type, target_id)
  values (auth.uid(), p_organization_id, 'organization_member.removed', 'user', p_user_id::text);
  return true;
end; $$;

-- 4b. Room audience inspection for main-room sharing confirmation
create or replace function public.sr_room_audience(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_room public.rooms;
  v_parent public.rooms;
  v_target_id uuid;
  v_orgs jsonb;
  v_digest_input text;
  v_digest text;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select * into v_room from public.rooms where id = p_room_id;
  if not found or not public.is_room_member(p_room_id) then
    raise exception 'room_access_denied' using errcode = '42501';
  end if;

  v_target_id := coalesce(v_room.parent_room_id, v_room.id);
  select * into v_parent from public.rooms where id = v_target_id;

  -- Verify user has permission to inspect target room audience:
  -- Must be an active member of target room or an authorized sub-room with active organization standing in both
  if not public.is_room_member(v_target_id) and not exists (
    select 1 from public.room_members sub_m
    join public.organization_memberships sub_om
      on sub_om.organization_id = sub_m.acting_organization_id
     and sub_om.user_id = sub_m.user_id
     and sub_om.removed_at is null
    join public.room_members par_m
      on par_m.acting_organization_id = sub_m.acting_organization_id
     and par_m.removed_at is null
    join public.organization_memberships par_om
      on par_om.organization_id = par_m.acting_organization_id
     and par_om.user_id = par_m.user_id
     and par_om.removed_at is null
    where sub_m.room_id = p_room_id and sub_m.user_id = auth.uid() and sub_m.removed_at is null
      and par_m.room_id = v_target_id
  ) then
    raise exception 'room_access_denied' using errcode = '42501';
  end if;

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', o.org_id,
          'name', o.org_name,
          'member_count', o.cnt,
          'members', o.members
        ) order by o.org_id
      ),
      '[]'::jsonb
    ),
    coalesce(string_agg(o.digest_part, ',' order by o.org_id), '')
  into v_orgs, v_digest_input
  from (
    select
      rm.acting_organization_id as org_id,
      coalesce(org.name, 'Organization') as org_name,
      count(*)::int as cnt,
      jsonb_agg(
        jsonb_build_object(
          'user_id', rm.user_id,
          'display_name', coalesce(rm.member_display_name, 'Member')
        ) order by rm.user_id
      ) as members,
      rm.acting_organization_id::text || ':' || string_agg(rm.user_id::text, ';' order by rm.user_id) as digest_part
    from public.room_members rm
    join public.organizations org on org.id = rm.acting_organization_id
    join public.organization_memberships om
      on om.organization_id = rm.acting_organization_id
     and om.user_id = rm.user_id
     and om.removed_at is null
    where rm.room_id = v_target_id and rm.removed_at is null
    group by rm.acting_organization_id, org.name
  ) o;

  v_digest := encode(digest(convert_to(v_digest_input, 'UTF8'), 'sha256'), 'hex');

  return jsonb_build_object(
    'target_room_id', v_target_id,
    'target_room_name', v_parent.name,
    'orgs', v_orgs,
    'digest', v_digest
  );
end;
$$;

revoke all on function public.sr_room_audience(uuid) from public, anon;
grant execute on function public.sr_room_audience(uuid) to authenticated;

-- Revoke legacy unconfirmed share to parent RPC to prevent bypass
revoke execute on function public.sr_share_to_parent(uuid, uuid, uuid, text, uuid[]) from public, authenticated, anon;

-- 5. Confirmed sharing to parent room with audience digest check
create or replace function public.sr_share_to_parent_confirmed(
  p_room_id uuid,
  p_actor_organization_id uuid,
  p_client_msg_id uuid,
  p_text text,
  p_source_event_ids uuid[] default '{}',
  p_audience_digest text default null
)
returns public.room_events language plpgsql security definer set search_path = public, extensions as $$
declare
  v_room public.rooms;
  v_clean text := public.sr_clean_message_text(p_text, 4000);
  v_aud jsonb;
  v_current_digest text;
  v_refs jsonb;
  v_ev public.room_events;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select * into v_room from public.rooms where id = p_room_id;
  if not found or v_room.parent_room_id is null or public.sr_room_role(p_room_id, p_actor_organization_id) is null then
    raise exception 'room_access_denied' using errcode = '42501';
  end if;
  if v_clean is null then raise exception 'invalid_summary' using errcode = '22023'; end if;

  -- Acquire exclusive locks in global order: 1. organizations (order by id), 2. rooms (order by id)
  perform 1 from public.organizations where id in (
    select distinct rm.acting_organization_id
    from public.room_members rm
    where rm.room_id = v_room.parent_room_id and rm.removed_at is null
  ) order by id for update;
  perform 1 from public.rooms where id = v_room.parent_room_id order by id for update;

  -- Validate audience digest to prevent check-then-act race conditions
  if p_audience_digest is null or trim(p_audience_digest) = '' then
    raise exception 'audience_digest_required' using errcode = '22023';
  end if;

  v_aud := public.sr_room_audience(p_room_id);
  v_current_digest := v_aud->>'digest';
  if v_current_digest is null or v_current_digest <> trim(p_audience_digest) then
    raise exception 'audience_changed' using errcode = '22023';
  end if;

  -- Filter sources: never expose internal room references to parent room
  select coalesce(jsonb_agg(jsonb_build_object('event_id', e.id, 'seq', e.seq)), '[]'::jsonb) into v_refs
    from public.room_events e
   where e.room_id = p_room_id and e.id = any(coalesce(p_source_event_ids, '{}'))
     and not public.sr_room_is_internal(v_room.kind);

  v_ev := public.append_room_event(
    v_room.parent_room_id,
    p_client_msg_id,
    p_actor_organization_id,
    'room.summary_shared',
    jsonb_build_object(
      'text', v_clean,
      'from_room_id', case when public.sr_room_is_internal(v_room.kind) then null else v_room.id end,
      'from_room_name', case when public.sr_room_is_internal(v_room.kind) then null else v_room.name end,
      'sources', v_refs,
      'audience_digest', coalesce(p_audience_digest, '')
    )
  );

  return v_ev;
end;
$$;

revoke all on function public.sr_share_to_parent_confirmed(uuid, uuid, uuid, text, uuid[], text) from public, anon;
grant execute on function public.sr_share_to_parent_confirmed(uuid, uuid, uuid, text, uuid[], text) to authenticated;

-- 6. Canonical timeline RPC with automatic redaction masking
create or replace function public.sr_room_timeline(
  p_room_id uuid,
  p_after_seq bigint default null,
  p_before_seq bigint default null,
  p_limit int default 50
)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_acting_org uuid;
  v_rows jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not public.is_room_member(p_room_id) then raise exception 'room_access_denied' using errcode = '42501'; end if;

  select rm.acting_organization_id into v_acting_org
    from public.room_members rm
   where rm.room_id = p_room_id and rm.user_id = auth.uid() and rm.removed_at is null
   limit 1;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'seq', e.seq,
        'client_msg_id', e.client_msg_id,
        'actor_user_id', e.actor_user_id,
        'actor_organization_id', e.actor_organization_id,
        'event_type', e.event_type,
        'payload', case
          when p.redaction_event_id is not null and e.actor_organization_id <> v_acting_org then
            jsonb_build_object(
              'redacted', true,
              'redacted_at', p.redacted_at,
              'reason_code', coalesce(re.payload->>'reason_code', 'redacted')
            )
          else e.payload
        end,
        'prev_hash', e.prev_hash,
        'content_hash', e.content_hash,
        'created_at', e.created_at,
        'hash_version', coalesce(e.hash_version, 1),
        'payload_hash', e.payload_hash,
        'is_redacted', (p.redaction_event_id is not null),
        'redacted_at', p.redacted_at
      ) order by e.seq asc
    ),
    '[]'::jsonb
  ) into v_rows
  from (
    select e.*
    from public.room_events e
    where e.room_id = p_room_id
      and (p_after_seq is null or e.seq > p_after_seq)
      and (p_before_seq is null or e.seq < p_before_seq)
    order by e.seq desc
    limit v_limit
  ) e
  left join public.room_message_projection p on p.event_id = e.id
  left join public.room_events re on re.id = p.redaction_event_id;

  return v_rows;
end;
$$;

revoke all on function public.sr_room_timeline(uuid, bigint, bigint, int) from public, anon;
grant execute on function public.sr_room_timeline(uuid, bigint, bigint, int) to authenticated;
