create role service_role;
create role authenticated;
create role anon;
create schema auth;
create table auth.users(id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
create table public.organizations(id uuid primary key);
create table public.rooms(id uuid primary key);
create table public.room_events(id uuid primary key,room_id uuid not null);
create table public.room_members(room_id uuid,user_id uuid,acting_organization_id uuid,removed_at timestamptz);
create or replace function public.is_room_member(p_room_id uuid)
  returns boolean language sql stable as $$select exists(
    select 1 from public.room_members
    where room_id=p_room_id and user_id=auth.uid() and removed_at is null
  )$$;
create or replace function public.is_org_member(p_org_id uuid)
  returns boolean language sql stable as $$select exists(
    select 1 from public.room_members
    where acting_organization_id=p_org_id and user_id=auth.uid() and removed_at is null
  )$$;
create table public.event_outbox(
  id bigint generated always as identity primary key,
  room_id uuid not null,room_event_id uuid not null,
  status text not null default 'pending',
  attempts integer not null default 0,available_at timestamptz not null default now(),
  locked_at timestamptz,last_error text
);
create table public.staging_proposals(
  id uuid default gen_random_uuid() primary key,
  room_id uuid not null,source_event_id uuid not null,proposal_type text not null,
  payload jsonb not null default '{}'::jsonb,confidence numeric(5,4) not null default 0,
  provider text not null default 'rules',status text not null default 'pending',
  created_at timestamptz not null default now(),reviewed_at timestamptz,
  reviewed_by_user_id uuid,reviewed_by_organization_id uuid
);
create table public.needs_you(
  id uuid default gen_random_uuid() primary key,
  room_id uuid not null,source_event_id uuid,proposal_id uuid,
  title text,detail text,priority text,status text not null default 'open',
  target_organization_id uuid,created_at timestamptz not null default now(),
  resolved_at timestamptz,resolved_by_user_id uuid
);
create table public.canonical_objects(
  id uuid default gen_random_uuid() primary key,room_id uuid not null,
  object_type text,payload jsonb,source_event_id uuid,accepted_proposal_id uuid unique,
  version_no integer,status text not null default 'active',
  committed_by_user_id uuid,committed_by_organization_id uuid,
  committed_at timestamptz not null default now()
);
create table public.audit_log(
  id bigint generated always as identity primary key,actor_user_id uuid,
  actor_organization_id uuid,room_id uuid,
  action text,target_type text,target_id text,metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);