-- 202611230001_p1_event_immutability_hash_v2.sql
-- Phase 1 - Week 1: Event Immutability, Hash Chain v2, and Event Type Constraints
set local lock_timeout = '3s';

-- 1. Add hash_version and payload_hash columns to public.room_events
alter table public.room_events
  add column if not exists hash_version smallint not null default 1
    check (hash_version in (1, 2)),
  add column if not exists payload_hash text
    check (payload_hash is null or payload_hash ~ '^[0-9a-f]{64}$');

-- 2. Principle I1: Append-only enforcement for room_events (forbid update, delete, truncate)
create or replace function public.sr_forbid_event_mutation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(current_setting('sr.event_maintenance', true), '') = 'on' then
    return coalesce(new, old);
  end if;
  raise exception 'room_events_append_only' using errcode = '42501';
end; $$;

revoke all on function public.sr_forbid_event_mutation() from public, anon, authenticated;
grant execute on function public.sr_forbid_event_mutation() to postgres, service_role;

drop trigger if exists room_events_no_update on public.room_events;
create trigger room_events_no_update
  before update on public.room_events
  for each row execute function public.sr_forbid_event_mutation();

drop trigger if exists room_events_no_delete on public.room_events;
create trigger room_events_no_delete
  before delete on public.room_events
  for each row execute function public.sr_forbid_event_mutation();

drop trigger if exists room_events_no_truncate on public.room_events;
create trigger room_events_no_truncate
  before truncate on public.room_events
  for each statement execute function public.sr_forbid_event_mutation();

-- 3. Extend event types check constraint
alter table public.room_events drop constraint if exists room_events_event_type_check;
alter table public.room_events add constraint room_events_event_type_check check (event_type in (
  'message.posted',
  'message.edited',
  'message.redacted',
  'file.attached',
  'proposal.created',
  'proposal.reviewed',
  'object.version_committed',
  'member.joined',
  'member.removed',
  'room.summary_shared',
  'file.review_requested',
  'confirmation.recorded',
  'file.first_accessed',
  'room.legal_hold_changed',
  'bid.sealed',
  'bid.opened'
));

-- 4. Rebuild append_room_event with v2 hash algorithm
create or replace function public.append_room_event(
  p_room_id uuid,
  p_client_msg_id uuid,
  p_actor_organization_id uuid,
  p_event_type text,
  p_payload jsonb default '{}'::jsonb
)
returns public.room_events
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_existing public.room_events;
  v_seq bigint;
  v_prev_hash text;
  v_hash text;
  v_payload jsonb;
  v_payload_hash text;
  v_ts text;
  v_now timestamptz := clock_timestamp();
  v_result public.room_events;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if not public.is_room_member(p_room_id) then
    raise exception 'room_access_denied' using errcode = '42501';
  end if;

  if not public.is_org_member(p_actor_organization_id) then
    raise exception 'acting_org_access_denied' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.room_members rm
    where rm.room_id = p_room_id
      and rm.user_id = auth.uid()
      and rm.acting_organization_id = p_actor_organization_id
      and rm.removed_at is null
  ) then
    raise exception 'acting_org_not_bound_to_room' using errcode = '42501';
  end if;

  select *
  into v_existing
  from public.room_events e
  where e.room_id = p_room_id
    and e.client_msg_id = p_client_msg_id;

  if found then
    return v_existing;
  end if;

  update public.rooms
  set last_seq = last_seq + 1
  where id = p_room_id
  returning last_seq into v_seq;

  if v_seq is null then
    raise exception 'room_not_found';
  end if;

  select e.content_hash
  into v_prev_hash
  from public.room_events e
  where e.room_id = p_room_id
    and e.seq = v_seq - 1;

  -- v2 hash calculation:
  -- 1) sha256 of canonical payload json text
  -- 2) UTC ISO 8601 formatted timestamp
  -- 3) sha256 of pipeline fields with payload_hash
  v_payload := coalesce(p_payload, '{}'::jsonb);
  v_payload_hash := encode(digest(convert_to(v_payload::text, 'UTF8'), 'sha256'), 'hex');
  v_ts := to_char(v_now at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');

  v_hash := encode(
    digest(
      convert_to(
        concat_ws(
          '|',
          'v2',
          p_room_id::text,
          v_seq::text,
          p_client_msg_id::text,
          auth.uid()::text,
          p_actor_organization_id::text,
          p_event_type,
          v_payload_hash,
          coalesce(v_prev_hash, ''),
          v_ts
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  insert into public.room_events (
    room_id,
    seq,
    client_msg_id,
    actor_user_id,
    actor_organization_id,
    event_type,
    payload,
    prev_hash,
    content_hash,
    created_at,
    hash_version,
    payload_hash
  )
  values (
    p_room_id,
    v_seq,
    p_client_msg_id,
    auth.uid(),
    p_actor_organization_id,
    p_event_type,
    v_payload,
    v_prev_hash,
    v_hash,
    v_now,
    2,
    v_payload_hash
  )
  returning * into v_result;

  update public.rooms
  set digest_head = v_hash
  where id = p_room_id;

  insert into public.audit_log (
    actor_user_id,
    actor_organization_id,
    room_id,
    action,
    target_type,
    target_id,
    metadata
  )
  values (
    auth.uid(),
    p_actor_organization_id,
    p_room_id,
    'room_event.appended',
    'room_event',
    v_result.id::text,
    jsonb_build_object('seq', v_seq, 'event_type', p_event_type, 'hash_version', 2)
  );

  insert into public.event_outbox (
    room_id,
    room_event_id,
    event_kind,
    payload
  )
  values (
    p_room_id,
    v_result.id,
    'room.event.hint',
    jsonb_build_object('room_id', p_room_id, 'seq', v_seq, 'event_type', p_event_type)
  )
  on conflict (room_event_id, event_kind) do nothing;

  return v_result;
end;
$$;

revoke execute on function public.append_room_event(uuid, uuid, uuid, text, jsonb) from authenticated, anon, public;
grant execute on function public.append_room_event(uuid, uuid, uuid, text, jsonb) to postgres, service_role;
