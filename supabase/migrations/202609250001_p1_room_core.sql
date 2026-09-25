-- SourceRating V4 P1 room core
-- Canonical collaboration state lives in Postgres. Realtime is delivery/presence only.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  primary key (organization_id, user_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  code text,
  status text not null default 'active' check (status in ('active','on_hold','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_participants (
  project_id uuid not null references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_role text not null check (project_role in ('buyer','supplier','provider','inspector','engineer','logistics')),
  created_at timestamptz not null default now(),
  primary key (project_id, organization_id, project_role)
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null check (kind in ('buyer_internal','supplier_external','provider_external','shared_execution')),
  name text not null,
  owner_organization_id uuid not null references public.organizations(id) on delete restrict,
  counterpart_organization_id uuid references public.organizations(id) on delete restrict,
  last_seq bigint not null default 0,
  digest_head text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  acting_organization_id uuid not null references public.organizations(id) on delete restrict,
  room_role text not null check (room_role in ('admin','member','viewer')),
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  primary key (room_id, user_id, acting_organization_id)
);

create table if not exists public.room_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  seq bigint not null,
  client_msg_id uuid not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  actor_organization_id uuid not null references public.organizations(id) on delete restrict,
  event_type text not null check (event_type in (
    'message.posted',
    'message.edited',
    'message.redacted',
    'file.attached',
    'proposal.created',
    'proposal.reviewed',
    'object.version_committed',
    'member.joined',
    'member.removed'
  )),
  payload jsonb not null default '{}'::jsonb,
  prev_hash text,
  content_hash text not null,
  created_at timestamptz not null default now(),
  unique (room_id, seq),
  unique (room_id, client_msg_id)
);

create index if not exists room_events_room_seq_idx on public.room_events(room_id, seq);
create index if not exists room_members_user_idx on public.room_members(user_id, room_id) where removed_at is null;
create index if not exists org_members_user_idx on public.organization_memberships(user_id, organization_id) where removed_at is null;
create index if not exists project_participants_org_idx on public.project_participants(organization_id, project_id);

create table if not exists public.room_context_projections (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  source_seq bigint not null default 0,
  recent_important_events jsonb not null default '[]'::jsonb,
  open_questions jsonb not null default '[]'::jsonb,
  pending_actions jsonb not null default '[]'::jsonb,
  active_files jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_organization_id uuid references public.organizations(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Durable internal outbox. It is not exposed to authenticated clients.
-- P1 uses it for realtime hint dispatch; P3 can also fan out AI/compaction jobs.
create table if not exists public.event_outbox (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  room_event_id uuid not null references public.room_events(id) on delete cascade,
  event_kind text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','delivered','failed')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (room_event_id, event_kind)
);

create index if not exists event_outbox_pending_idx
  on public.event_outbox(status, available_at, id)
  where status in ('pending','failed');

create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = p_org_id
      and m.user_id = auth.uid()
      and m.removed_at is null
  );
$$;

create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.room_members rm
    where rm.room_id = p_room_id
      and rm.user_id = auth.uid()
      and rm.removed_at is null
      and public.is_org_member(rm.acting_organization_id)
  );
$$;

create or replace function public.can_view_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_participants pp
    where pp.project_id = p_project_id
      and public.is_org_member(pp.organization_id)
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.is_room_member(uuid) from public;
revoke all on function public.can_view_project(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.can_view_project(uuid) to authenticated;

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.projects enable row level security;
alter table public.project_participants enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_events enable row level security;
alter table public.room_context_projections enable row level security;
alter table public.audit_log enable row level security;
alter table public.event_outbox enable row level security;

drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
for select to authenticated
using (
  public.is_org_member(id)
  or exists (
    select 1
    from public.project_participants visible_pp
    join public.project_participants my_pp
      on my_pp.project_id = visible_pp.project_id
    where visible_pp.organization_id = organizations.id
      and public.is_org_member(my_pp.organization_id)
  )
);

drop policy if exists org_memberships_select on public.organization_memberships;
create policy org_memberships_select on public.organization_memberships
for select to authenticated
using (public.is_org_member(organization_id));

drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
for select to authenticated
using (public.can_view_project(id));

drop policy if exists project_participants_select on public.project_participants;
create policy project_participants_select on public.project_participants
for select to authenticated
using (public.can_view_project(project_id));

drop policy if exists rooms_select on public.rooms;
create policy rooms_select on public.rooms
for select to authenticated
using (public.is_room_member(id));

drop policy if exists room_members_select on public.room_members;
create policy room_members_select on public.room_members
for select to authenticated
using (public.is_room_member(room_id));

drop policy if exists room_events_select on public.room_events;
create policy room_events_select on public.room_events
for select to authenticated
using (public.is_room_member(room_id));

drop policy if exists context_projection_select on public.room_context_projections;
create policy context_projection_select on public.room_context_projections
for select to authenticated
using (public.is_room_member(room_id));

drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log
for select to authenticated
using (
  (room_id is not null and public.is_room_member(room_id))
  or (room_id is null and project_id is not null and public.can_view_project(project_id))
);

-- Canonical write path for P1 room events.
-- Idempotency: duplicate (room_id, client_msg_id) returns the original row.
-- Ordering: rooms.last_seq is incremented under the same row lock/transaction.
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

  v_hash := encode(
    digest(
      convert_to(
        concat_ws(
          '|',
          p_room_id::text,
          v_seq::text,
          p_client_msg_id::text,
          auth.uid()::text,
          p_actor_organization_id::text,
          p_event_type,
          coalesce(p_payload, '{}'::jsonb)::text,
          coalesce(v_prev_hash, ''),
          v_now::text
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
    created_at
  )
  values (
    p_room_id,
    v_seq,
    p_client_msg_id,
    auth.uid(),
    p_actor_organization_id,
    p_event_type,
    coalesce(p_payload, '{}'::jsonb),
    v_prev_hash,
    v_hash,
    v_now
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
    jsonb_build_object('seq', v_seq, 'event_type', p_event_type)
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

revoke all on function public.append_room_event(uuid, uuid, uuid, text, jsonb) from public;
grant execute on function public.append_room_event(uuid, uuid, uuid, text, jsonb) to authenticated;

-- Direct mutation of the append-only event stream is intentionally unsupported for authenticated clients.
revoke insert, update, delete on public.room_events from authenticated;
revoke insert, update, delete on public.audit_log from authenticated;
revoke all on public.event_outbox from anon, authenticated;