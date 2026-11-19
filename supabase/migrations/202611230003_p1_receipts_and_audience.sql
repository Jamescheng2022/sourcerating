-- 202611230003_p1_receipts_and_audience.sql
-- Phase 1 - Week 1: Organization Read Receipts and File Access Evidence
set local lock_timeout = '3s';

-- 1. Create message_receipts append-only table
create table if not exists public.message_receipts (
  id              bigint generated always as identity primary key,
  room_id         uuid not null references public.rooms(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id         uuid not null references auth.users(id) on delete restrict,
  kind            text not null check (kind in ('read', 'file_access')),
  up_to_seq       bigint,
  file_version_id uuid references public.room_file_versions(id) on delete restrict,
  derivative_sha256 text,
  created_at      timestamptz not null default clock_timestamp(),
  check (
    (kind = 'read' and up_to_seq is not null and file_version_id is null)
    or
    (kind = 'file_access' and file_version_id is not null)
  )
);

create index if not exists message_receipts_room_org_idx
  on public.message_receipts (room_id, organization_id, created_at desc);

create index if not exists message_receipts_file_idx
  on public.message_receipts (file_version_id, organization_id)
  where kind = 'file_access';

-- Enforce append-only on message_receipts
drop trigger if exists message_receipts_no_update on public.message_receipts;
create trigger message_receipts_no_update
  before update on public.message_receipts
  for each row execute function public.sr_forbid_event_mutation();

drop trigger if exists message_receipts_no_delete on public.message_receipts;
create trigger message_receipts_no_delete
  before delete on public.message_receipts
  for each row execute function public.sr_forbid_event_mutation();

drop trigger if exists message_receipts_no_truncate on public.message_receipts;
create trigger message_receipts_no_truncate
  before truncate on public.message_receipts
  for each statement execute function public.sr_forbid_event_mutation();

alter table public.message_receipts enable row level security;
alter table public.message_receipts force row level security;

drop policy if exists message_receipts_own_org on public.message_receipts;
create policy message_receipts_own_org on public.message_receipts
  for select to authenticated
  using (
    public.is_org_member(organization_id)
    and public.is_room_member(room_id)
  );

revoke all on public.message_receipts from public, anon;
grant select on public.message_receipts to authenticated;
grant all on public.message_receipts to postgres, service_role;

-- 2. Enhanced sr_mark_room_read that appends receipts only when watermark advances
create or replace function public.sr_mark_room_read(p_room_id uuid, p_seq bigint)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare
  v_acting_org uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;

  update public.room_members
     set last_read_seq = p_seq
   where room_id = p_room_id
     and user_id = auth.uid()
     and removed_at is null
     and last_read_seq < p_seq
     and p_seq <= (select last_seq from public.rooms where id = p_room_id)
   returning acting_organization_id into v_acting_org;

  if v_acting_org is not null then
    insert into public.message_receipts (room_id, organization_id, user_id, kind, up_to_seq)
    values (p_room_id, v_acting_org, auth.uid(), 'read', p_seq);
    return true;
  end if;

  return exists (
    select 1 from public.room_members
     where room_id = p_room_id and user_id = auth.uid() and removed_at is null
  );
end;
$$;

revoke all on function public.sr_mark_room_read(uuid, bigint) from public, anon;
grant execute on function public.sr_mark_room_read(uuid, bigint) to authenticated;

-- 3. Aggregate room read state (privacy-safe: external sees N/M, own org sees names)
create or replace function public.sr_room_read_state(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_my_org uuid;
  v_res jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not public.is_room_member(p_room_id) then raise exception 'room_access_denied' using errcode = '42501'; end if;

  select rm.acting_organization_id into v_my_org
    from public.room_members rm
   where rm.room_id = p_room_id and rm.user_id = auth.uid() and rm.removed_at is null
   limit 1;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'organization_id', o.org_id,
        'organization_name', o.org_name,
        'member_count', o.cnt,
        'watermarks', o.watermarks,
        'members', case
          when o.org_id = v_my_org then o.member_details
          else '[]'::jsonb
        end
      ) order by o.org_id
    ),
    '[]'::jsonb
  ) into v_res
  from (
    select
      rm.acting_organization_id as org_id,
      coalesce(org.display_name, org.name, 'Organization') as org_name,
      count(*)::int as cnt,
      jsonb_agg(rm.last_read_seq order by rm.last_read_seq desc) as watermarks,
      jsonb_agg(
        jsonb_build_object(
          'user_id', rm.user_id,
          'name', coalesce(rm.member_display_name, 'Member'),
          'last_read_seq', rm.last_read_seq
        )
      ) as member_details
    from public.room_members rm
    join public.organizations org on org.id = rm.acting_organization_id
    where rm.room_id = p_room_id and rm.removed_at is null
    group by rm.acting_organization_id, org.display_name, org.name
  ) o;

  return v_res;
end;
$$;

revoke all on function public.sr_room_read_state(uuid) from public, anon;
grant execute on function public.sr_room_read_state(uuid) to authenticated;

-- 4. File access evidence recorder (called by file gateway upon URL signing)
create or replace function public.sr_record_file_access(
  p_file_version_id uuid,
  p_actor_organization_id uuid
)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_f public.room_file_versions;
  v_is_first boolean := false;
  v_ev public.room_events;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select * into v_f from public.room_file_versions where id = p_file_version_id;
  if not found or not public.is_room_member(v_f.room_id) then
    raise exception 'file_access_denied' using errcode = '42501';
  end if;

  -- Check if this organization has ever accessed this file version before
  if not exists (
    select 1 from public.message_receipts
     where file_version_id = p_file_version_id
       and organization_id = p_actor_organization_id
       and kind = 'file_access'
  ) then
    v_is_first := true;
  end if;

  insert into public.message_receipts (room_id, organization_id, user_id, kind, file_version_id)
  values (v_f.room_id, p_actor_organization_id, auth.uid(), 'file_access', p_file_version_id);

  if v_is_first then
    v_ev := public.append_room_event(
      v_f.room_id,
      gen_random_uuid(),
      p_actor_organization_id,
      'file.first_accessed',
      jsonb_build_object(
        'file_version_id', v_f.id,
        'logical_name', v_f.logical_name,
        'version_no', v_f.version_no,
        'sha256', v_f.sha256,
        'organization_id', p_actor_organization_id
      )
    );
  end if;

  return jsonb_build_object(
    'recorded', true,
    'is_first_access', v_is_first,
    'file_version_id', v_f.id
  );
end;
$$;

revoke all on function public.sr_record_file_access(uuid, uuid) from public, anon;
grant execute on function public.sr_record_file_access(uuid, uuid) to authenticated;
