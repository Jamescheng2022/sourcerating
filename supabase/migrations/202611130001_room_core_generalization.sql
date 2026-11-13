-- SourceRating Project Room B: general collaboration core (2026-11-13).
-- Additive only. Existing tables, RPCs and policies used by /project-room keep working.
-- New entities: ONE table (room_confirmations). Everything else is columns, relaxed
-- CHECK lists and security-definer RPCs prefixed sr_.
--
--   * any organization can create projects and invite any other organization
--   * rooms get a parent (main room -> sub rooms) and a neutral kind
--   * per-organization confirmations bound to a file version id + sha256
--   * read marker for unread counts
--
-- Rollback: see the block at the end of this file.

-- 1. Neutral vocabulary -------------------------------------------------------

alter table public.rooms
  add column if not exists parent_room_id uuid references public.rooms(id) on delete restrict,
  add column if not exists purpose text check (purpose is null or char_length(purpose) <= 500);
create index if not exists rooms_parent_idx on public.rooms(parent_room_id) where parent_room_id is not null;

alter table public.rooms drop constraint if exists rooms_kind_check;
alter table public.rooms add constraint rooms_kind_check check (kind in (
  'buyer_internal','supplier_external','provider_external','shared_execution',
  'main','internal','external'));

alter table public.project_participants drop constraint if exists project_participants_project_role_check;
alter table public.project_participants add constraint project_participants_project_role_check check (project_role in (
  'buyer','supplier','provider','inspector','engineer','logistics',
  'consultant','designer','contractor','participant'));

alter table public.project_invites alter column target_organization_id drop not null;
alter table public.project_invites
  add column if not exists target_organization_name text,
  add column if not exists project_role text;
alter table public.project_invites drop constraint if exists project_invites_invited_role_check;
alter table public.project_invites add constraint project_invites_invited_role_check check (invited_role in (
  'supplier','provider','buyer_member','organization','org_member'));

alter table public.room_events drop constraint if exists room_events_event_type_check;
alter table public.room_events add constraint room_events_event_type_check check (event_type in (
  'message.posted','message.edited','message.redacted','file.attached',
  'proposal.created','proposal.reviewed','object.version_committed',
  'member.joined','member.removed',
  'room.summary_shared','file.review_requested','confirmation.recorded'));

alter table public.organization_memberships
  add column if not exists display_name text
  check (display_name is null or length(btrim(display_name)) between 1 and 120);

alter table public.room_members
  add column if not exists last_read_seq bigint not null default 0;

-- 2. Per-organization confirmations ------------------------------------------
-- Append-only. The current state for (subject, organization) is its latest row.
-- A file confirmation names one immutable version row and repeats its sha256, so
-- it can never be read as approval of a later version.

create table if not exists public.room_confirmations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  subject_type text not null check (subject_type in ('file_version','proposal')),
  file_version_id uuid references public.room_file_versions(id) on delete restrict,
  file_sha256 text check (file_sha256 is null or char_length(file_sha256) = 64),
  proposal_id uuid references public.staging_proposals(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  decision text not null check (decision in ('confirmed','changes_requested')),
  comment text check (comment is null or char_length(comment) <= 2000),
  source_event_id uuid references public.room_events(id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (subject_type = 'file_version' and file_version_id is not null and file_sha256 is not null and proposal_id is null)
    or (subject_type = 'proposal' and proposal_id is not null and file_version_id is null)
  )
);
create index if not exists room_confirmations_room_idx on public.room_confirmations(room_id, created_at);
create index if not exists room_confirmations_file_idx on public.room_confirmations(file_version_id, organization_id, created_at desc)
  where file_version_id is not null;
create index if not exists room_confirmations_proposal_idx on public.room_confirmations(proposal_id, organization_id, created_at desc)
  where proposal_id is not null;

alter table public.room_confirmations enable row level security;
drop policy if exists room_confirmations_select on public.room_confirmations;
create policy room_confirmations_select on public.room_confirmations
for select to authenticated using (public.is_room_member(room_id));
revoke all on public.room_confirmations from anon, authenticated;
grant select on public.room_confirmations to authenticated;

-- 3. Helpers ------------------------------------------------------------------

create or replace function public.sr_org_role(p_org_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select m.role from public.organization_memberships m
  where m.organization_id = p_org_id and m.user_id = auth.uid() and m.removed_at is null;
$$;

create or replace function public.sr_room_role(p_room_id uuid, p_org_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select rm.room_role from public.room_members rm
  where rm.room_id = p_room_id and rm.user_id = auth.uid()
    and rm.acting_organization_id = p_org_id and rm.removed_at is null
    and public.is_org_member(p_org_id);
$$;

create or replace function public.sr_clean_name(p_text text, p_max integer)
returns text language sql immutable as $$
  select nullif(left(btrim(regexp_replace(coalesce(p_text,''), '[[:cntrl:]]', ' ', 'g')), p_max), '');
$$;

-- Internal rooms belong to exactly one organization.
create or replace function public.sr_room_is_internal(p_kind text)
returns boolean language sql immutable as $$ select p_kind in ('internal','buyer_internal'); $$;

-- 4. Organizations and projects ----------------------------------------------

create or replace function public.sr_create_organization(p_name text, p_display_name text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_name text := public.sr_clean_name(p_name, 160);
  v_id uuid := gen_random_uuid();
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if v_name is null or char_length(v_name) < 2 then raise exception 'invalid_organization_name' using errcode = '22023'; end if;
  if (select count(*) from public.organization_memberships
      where user_id = auth.uid() and role = 'owner' and removed_at is null) >= 5 then
    raise exception 'organization_limit_reached' using errcode = '42501';
  end if;
  insert into public.organizations(id, name, slug)
  values (v_id, v_name, 'org-' || substr(replace(v_id::text,'-',''),1,12));
  insert into public.organization_memberships(organization_id, user_id, role, display_name)
  values (v_id, auth.uid(), 'owner', public.sr_clean_name(p_display_name, 120));
  insert into public.audit_log(actor_user_id, actor_organization_id, action, target_type, target_id)
  values (auth.uid(), v_id, 'organization.created', 'organization', v_id::text);
  return jsonb_build_object('organization_id', v_id, 'name', v_name);
end; $$;

create or replace function public.sr_create_project(
  p_organization_id uuid, p_name text, p_project_role text default 'participant', p_code text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_name text := public.sr_clean_name(p_name, 160);
  v_project uuid := gen_random_uuid();
  v_room uuid := gen_random_uuid();
  v_display text;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if public.sr_org_role(p_organization_id) is null then
    raise exception 'organization_membership_required' using errcode = '42501';
  end if;
  if v_name is null or char_length(v_name) < 2 then raise exception 'invalid_project_name' using errcode = '22023'; end if;
  select display_name into v_display from public.organization_memberships
   where organization_id = p_organization_id and user_id = auth.uid();
  insert into public.projects(id, owner_organization_id, name, code)
  values (v_project, p_organization_id, v_name, public.sr_clean_name(p_code, 40));
  insert into public.project_participants(project_id, organization_id, project_role)
  values (v_project, p_organization_id, p_project_role);
  insert into public.rooms(id, project_id, kind, name, owner_organization_id, purpose)
  values (v_room, v_project, 'main', v_name, p_organization_id, null);
  insert into public.room_members(room_id, user_id, acting_organization_id, room_role, member_display_name)
  values (v_room, auth.uid(), p_organization_id, 'admin', v_display);
  insert into public.audit_log(actor_user_id, actor_organization_id, project_id, room_id, action, target_type, target_id)
  values (auth.uid(), p_organization_id, v_project, v_room, 'project.created', 'project', v_project::text);
  return jsonb_build_object('project_id', v_project, 'main_room_id', v_room);
end; $$;

-- 5. Invitations: any participant can invite; invitee keeps or creates its own org

create or replace function public.sr_create_invite(
  p_room_id uuid,
  p_actor_organization_id uuid,
  p_email text,
  p_kind text default 'organization',          -- 'organization' | 'org_member'
  p_organization_name text default null,       -- hint shown to the invitee
  p_project_role text default 'participant',
  p_expires_in_hours integer default 168)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_room public.rooms;
  v_role text := public.sr_room_role(p_room_id, p_actor_organization_id);
  v_email text := nullif(lower(btrim(coalesce(p_email,''))), '');
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_id uuid := gen_random_uuid();
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select * into v_room from public.rooms where id = p_room_id and archived_at is null;
  if not found or v_role is null then raise exception 'room_access_denied' using errcode = '42501'; end if;
  if v_role <> 'admin' then raise exception 'room_admin_required' using errcode = '42501'; end if;
  if v_email is null or length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invite_email_required' using errcode = '22023';
  end if;
  if p_expires_in_hours < 1 or p_expires_in_hours > 720 then raise exception 'invalid_invite_expiry' using errcode = '22023'; end if;
  if p_kind = 'org_member' then
    if public.sr_org_role(p_actor_organization_id) not in ('owner','admin') then
      raise exception 'organization_admin_required' using errcode = '42501';
    end if;
  elsif p_kind = 'organization' then
    if public.sr_room_is_internal(v_room.kind) then
      raise exception 'internal_room_is_single_organization' using errcode = '42501';
    end if;
  else
    raise exception 'invalid_invite_kind' using errcode = '22023';
  end if;
  insert into public.project_invites(
    id, token_hash, project_id, room_id, target_organization_id, target_organization_name,
    invited_role, project_role, invited_email, created_by_user_id, created_by_organization_id, expires_at)
  values (
    v_id, encode(digest(v_token,'sha256'),'hex'), v_room.project_id, p_room_id,
    case when p_kind = 'org_member' then p_actor_organization_id end,
    public.sr_clean_name(p_organization_name, 160),
    p_kind, case when p_kind = 'organization' then p_project_role end,
    v_email, auth.uid(), p_actor_organization_id, now() + make_interval(hours => p_expires_in_hours));
  insert into public.audit_log(actor_user_id, actor_organization_id, project_id, room_id, action, target_type, target_id, metadata)
  values (auth.uid(), p_actor_organization_id, v_room.project_id, p_room_id, 'project_invite.created', 'project_invite', v_id::text,
          jsonb_build_object('kind', p_kind, 'invited_email', v_email));
  return jsonb_build_object('invite_id', v_id, 'token', v_token, 'room_id', p_room_id, 'invited_email', v_email,
    'expires_at', now() + make_interval(hours => p_expires_in_hours));
end; $$;

-- What an invitee may see before accepting. Token is the capability; email must match.
create or replace function public.sr_preview_invite(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare v_i public.project_invites;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select * into v_i from public.project_invites where token_hash = encode(digest(p_token,'sha256'),'hex');
  if not found or lower(v_i.invited_email) <> lower(coalesce(auth.jwt()->>'email','')) then
    raise exception 'invite_not_found' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'kind', v_i.invited_role,
    'project_name', (select name from public.projects where id = v_i.project_id),
    'room_name', (select name from public.rooms where id = v_i.room_id),
    'invited_by', (select name from public.organizations where id = v_i.created_by_organization_id),
    'organization_name', coalesce(v_i.target_organization_name,
        (select name from public.organizations where id = v_i.target_organization_id)),
    'state', case when v_i.revoked_at is not null then 'revoked' when v_i.used_at is not null then 'used'
                  when v_i.expires_at <= now() then 'expired' else 'open' end);
end; $$;

create or replace function public.sr_accept_invite(
  p_token text,
  p_organization_id uuid default null,     -- join with an organization I already administer
  p_new_organization_name text default null,
  p_display_name text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_i public.project_invites;
  v_org uuid;
  v_display text := public.sr_clean_name(p_display_name, 120);
  v_room public.rooms;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select * into v_i from public.project_invites
   where token_hash = encode(digest(p_token,'sha256'),'hex') for update;
  if not found then raise exception 'invite_not_found' using errcode = '42501'; end if;
  if v_i.invited_role not in ('organization','org_member') then raise exception 'invite_kind_unsupported' using errcode = '42501'; end if;
  if v_i.revoked_at is not null then raise exception 'invite_revoked' using errcode = '42501'; end if;
  if v_i.used_at is not null then
    if v_i.used_by_user_id = auth.uid() then
      return jsonb_build_object('project_id', v_i.project_id, 'room_id', v_i.room_id,
        'acting_organization_id', v_i.target_organization_id, 'idempotent', true);
    end if;
    raise exception 'invite_already_used' using errcode = '42501';
  end if;
  if v_i.expires_at <= now() then raise exception 'invite_expired' using errcode = '42501'; end if;
  if v_i.invited_email is null or lower(v_i.invited_email) <> lower(coalesce(auth.jwt()->>'email','')) then
    raise exception 'invite_email_mismatch' using errcode = '42501';
  end if;
  select * into v_room from public.rooms where id = v_i.room_id;

  if v_i.invited_role = 'org_member' then
    v_org := v_i.target_organization_id;
    insert into public.organization_memberships(organization_id, user_id, role, display_name)
    values (v_org, auth.uid(), 'member', v_display)
    on conflict (organization_id, user_id) do update
      set removed_at = null, display_name = coalesce(excluded.display_name, organization_memberships.display_name);
  else
    if p_organization_id is not null then
      if public.sr_org_role(p_organization_id) not in ('owner','admin') then
        raise exception 'organization_admin_required' using errcode = '42501';
      end if;
      v_org := p_organization_id;
      if v_display is not null then
        update public.organization_memberships set display_name = v_display
         where organization_id = v_org and user_id = auth.uid();
      end if;
    else
      v_org := (public.sr_create_organization(
        coalesce(p_new_organization_name, v_i.target_organization_name), v_display)->>'organization_id')::uuid;
    end if;
    insert into public.project_participants(project_id, organization_id, project_role)
    values (v_i.project_id, v_org, coalesce(v_i.project_role,'participant'))
    on conflict do nothing;
  end if;

  if v_display is null then
    select display_name into v_display from public.organization_memberships
     where organization_id = v_org and user_id = auth.uid();
  end if;
  insert into public.room_members(room_id, user_id, acting_organization_id, room_role, member_display_name)
  values (v_i.room_id, auth.uid(), v_org,
          case when v_i.invited_role = 'organization' then 'admin' else 'member' end, v_display)
  on conflict (room_id, user_id, acting_organization_id) do update set removed_at = null;

  update public.project_invites
     set used_at = now(), used_by_user_id = auth.uid(), target_organization_id = v_org
   where id = v_i.id;
  insert into public.audit_log(actor_user_id, actor_organization_id, project_id, room_id, action, target_type, target_id)
  values (auth.uid(), v_org, v_i.project_id, v_i.room_id, 'project_invite.claimed', 'project_invite', v_i.id::text);
  return jsonb_build_object('project_id', v_i.project_id, 'room_id', v_i.room_id,
    'acting_organization_id', v_org, 'idempotent', false);
end; $$;

create or replace function public.sr_revoke_invite(p_invite_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_i public.project_invites;
begin
  select * into v_i from public.project_invites where id = p_invite_id for update;
  if not found or auth.uid() is null or not public.is_org_member(v_i.created_by_organization_id) then
    raise exception 'invite_not_found' using errcode = '42501';
  end if;
  if v_i.used_at is not null then raise exception 'invite_already_used' using errcode = '42501'; end if;
  update public.project_invites set revoked_at = coalesce(revoked_at, now()) where id = p_invite_id;
  insert into public.audit_log(actor_user_id, actor_organization_id, project_id, room_id, action, target_type, target_id)
  values (auth.uid(), v_i.created_by_organization_id, v_i.project_id, v_i.room_id, 'project_invite.revoked', 'project_invite', p_invite_id::text);
  return true;
end; $$;

-- 6. Sub rooms and membership -------------------------------------------------
-- A sub room never copies messages, files or members from its parent. People can
-- only be added from (a) the parent room or (b) the creator's own organization,
-- so creating a room can never pull a new outside party into the project.

create or replace function public.sr_create_sub_room(
  p_parent_room_id uuid,
  p_actor_organization_id uuid,
  p_name text,
  p_purpose text default null,
  p_kind text default 'external',            -- 'internal' | 'external' | 'shared_execution'
  p_member_user_ids uuid[] default '{}')
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_parent public.rooms;
  v_role text := public.sr_room_role(p_parent_room_id, p_actor_organization_id);
  v_name text := public.sr_clean_name(p_name, 120);
  v_room uuid := gen_random_uuid();
  v_uid uuid;
  v_org uuid;
  v_display text;
  v_added integer := 0;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select * into v_parent from public.rooms where id = p_parent_room_id and archived_at is null;
  if not found or v_role is null then raise exception 'room_access_denied' using errcode = '42501'; end if;
  if v_role = 'viewer' then raise exception 'room_write_denied' using errcode = '42501'; end if;
  if v_parent.parent_room_id is not null then raise exception 'sub_room_depth_exceeded' using errcode = '22023'; end if;
  if p_kind not in ('internal','external','shared_execution') then raise exception 'invalid_room_kind' using errcode = '22023'; end if;
  if v_name is null or char_length(v_name) < 2 then raise exception 'invalid_room_name' using errcode = '22023'; end if;
  if coalesce(array_length(p_member_user_ids,1),0) > 50 then raise exception 'too_many_members' using errcode = '22023'; end if;

  insert into public.rooms(id, project_id, kind, name, owner_organization_id, parent_room_id, purpose)
  values (v_room, v_parent.project_id, p_kind, v_name, p_actor_organization_id, p_parent_room_id,
          public.sr_clean_name(p_purpose, 500));

  select coalesce(rm.member_display_name, om.display_name) into v_display
    from public.room_members rm join public.organization_memberships om
      on om.organization_id = rm.acting_organization_id and om.user_id = rm.user_id
   where rm.room_id = p_parent_room_id and rm.user_id = auth.uid() and rm.acting_organization_id = p_actor_organization_id;
  insert into public.room_members(room_id, user_id, acting_organization_id, room_role, member_display_name)
  values (v_room, auth.uid(), p_actor_organization_id, 'admin', v_display);

  foreach v_uid in array coalesce(p_member_user_ids, '{}') loop
    continue when v_uid = auth.uid();
    v_org := null; v_display := null;
    -- (a) someone already in the parent room, with the organization they act for there
    select rm.acting_organization_id, rm.member_display_name into v_org, v_display
      from public.room_members rm
      join public.organization_memberships om
        on om.organization_id = rm.acting_organization_id and om.user_id = rm.user_id and om.removed_at is null
     where rm.room_id = p_parent_room_id and rm.user_id = v_uid and rm.removed_at is null
     order by (rm.acting_organization_id = p_actor_organization_id) desc
     limit 1;
    -- (b) a colleague in the creator's own organization
    if v_org is null then
      select om.organization_id, om.display_name into v_org, v_display
        from public.organization_memberships om
       where om.organization_id = p_actor_organization_id and om.user_id = v_uid and om.removed_at is null;
    end if;
    if v_org is null then raise exception 'member_not_eligible' using errcode = '42501'; end if;
    if p_kind = 'internal' and v_org <> p_actor_organization_id then
      raise exception 'internal_room_is_single_organization' using errcode = '42501';
    end if;
    insert into public.room_members(room_id, user_id, acting_organization_id, room_role, member_display_name)
    values (v_room, v_uid, v_org, 'member', v_display);
    v_added := v_added + 1;
  end loop;

  insert into public.audit_log(actor_user_id, actor_organization_id, project_id, room_id, action, target_type, target_id, metadata)
  values (auth.uid(), p_actor_organization_id, v_parent.project_id, v_room, 'room.created', 'room', v_room::text,
          jsonb_build_object('parent_room_id', p_parent_room_id, 'kind', p_kind, 'members_added', v_added));
  return jsonb_build_object('room_id', v_room, 'project_id', v_parent.project_id, 'members_added', v_added);
end; $$;

create or replace function public.sr_add_room_member(
  p_room_id uuid, p_actor_organization_id uuid, p_user_id uuid, p_member_organization_id uuid, p_room_role text default 'member')
returns boolean language plpgsql security definer set search_path = public as $$
declare v_room public.rooms; v_display text;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select * into v_room from public.rooms where id = p_room_id and archived_at is null;
  if not found or public.sr_room_role(p_room_id, p_actor_organization_id) is distinct from 'admin' then
    raise exception 'room_admin_required' using errcode = '42501';
  end if;
  if p_room_role not in ('admin','member','viewer') then raise exception 'invalid_room_role' using errcode = '22023'; end if;
  select display_name into v_display from public.organization_memberships
   where organization_id = p_member_organization_id and user_id = p_user_id and removed_at is null;
  if not found then raise exception 'member_not_eligible' using errcode = '42501'; end if;
  -- You may add your own colleagues; another organization's people only if that
  -- organization is already represented in this room or its parent.
  if p_member_organization_id <> p_actor_organization_id and not exists (
       select 1 from public.room_members rm
        where rm.room_id in (p_room_id, v_room.parent_room_id) and rm.user_id = p_user_id
          and rm.acting_organization_id = p_member_organization_id and rm.removed_at is null) then
    raise exception 'member_not_eligible' using errcode = '42501';
  end if;
  if public.sr_room_is_internal(v_room.kind) and p_member_organization_id <> v_room.owner_organization_id then
    raise exception 'internal_room_is_single_organization' using errcode = '42501';
  end if;
  insert into public.room_members(room_id, user_id, acting_organization_id, room_role, member_display_name)
  values (p_room_id, p_user_id, p_member_organization_id, p_room_role, v_display)
  on conflict (room_id, user_id, acting_organization_id) do update set removed_at = null, room_role = excluded.room_role;
  insert into public.audit_log(actor_user_id, actor_organization_id, project_id, room_id, action, target_type, target_id, metadata)
  values (auth.uid(), p_actor_organization_id, v_room.project_id, p_room_id, 'room_member.added', 'user', p_user_id::text,
          jsonb_build_object('room_role', p_room_role, 'organization_id', p_member_organization_id));
  return true;
end; $$;

create or replace function public.sr_remove_room_member(p_room_id uuid, p_actor_organization_id uuid, p_user_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_room public.rooms;
begin
  select * into v_room from public.rooms where id = p_room_id;
  if auth.uid() is null or not found then raise exception 'room_access_denied' using errcode = '42501'; end if;
  if p_user_id <> auth.uid() and public.sr_room_role(p_room_id, p_actor_organization_id) is distinct from 'admin' then
    raise exception 'room_admin_required' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() and public.sr_room_role(p_room_id, p_actor_organization_id) is null then
    raise exception 'room_access_denied' using errcode = '42501';
  end if;
  update public.room_members set removed_at = now()
   where room_id = p_room_id and user_id = p_user_id and removed_at is null;
  insert into public.audit_log(actor_user_id, actor_organization_id, project_id, room_id, action, target_type, target_id)
  values (auth.uid(), p_actor_organization_id, v_room.project_id, p_room_id, 'room_member.removed', 'user', p_user_id::text);
  return true;
end; $$;

-- Removing someone from the organization cuts every room at once: is_room_member()
-- already requires an active membership of the acting organization.
create or replace function public.sr_remove_org_member(p_organization_id uuid, p_user_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.sr_org_role(p_organization_id) not in ('owner','admin') then
    raise exception 'organization_admin_required' using errcode = '42501';
  end if;
  if exists (select 1 from public.organization_memberships
              where organization_id = p_organization_id and user_id = p_user_id and role = 'owner') then
    raise exception 'owner_cannot_be_removed' using errcode = '42501';
  end if;
  update public.organization_memberships set removed_at = now()
   where organization_id = p_organization_id and user_id = p_user_id and removed_at is null;
  insert into public.audit_log(actor_user_id, actor_organization_id, action, target_type, target_id)
  values (auth.uid(), p_organization_id, 'organization_member.removed', 'user', p_user_id::text);
  return true;
end; $$;

create or replace function public.sr_mark_room_read(p_room_id uuid, p_seq bigint)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.room_members set last_read_seq = greatest(last_read_seq, p_seq)
   where room_id = p_room_id and user_id = auth.uid() and removed_at is null
     and p_seq <= (select last_seq from public.rooms where id = p_room_id);
  return found;
end; $$;

-- 7. Deliberate hand-off from a sub room to its parent ------------------------
-- Nothing flows upward automatically. A person who is in both rooms chooses the
-- text. Internal rooms can share too, but only as words the person typed/approved.

create or replace function public.sr_share_to_parent(
  p_room_id uuid, p_actor_organization_id uuid, p_client_msg_id uuid, p_text text,
  p_source_event_ids uuid[] default '{}')
returns public.room_events language plpgsql security definer set search_path = public, extensions as $$
declare v_room public.rooms; v_text text := nullif(btrim(coalesce(p_text,'')), ''); v_refs jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select * into v_room from public.rooms where id = p_room_id;
  if not found or v_room.parent_room_id is null or public.sr_room_role(p_room_id, p_actor_organization_id) is null then
    raise exception 'room_access_denied' using errcode = '42501';
  end if;
  if v_text is null or char_length(v_text) > 4000 then raise exception 'invalid_summary' using errcode = '22023'; end if;
  -- Source references are only kept when the parent audience is allowed to know
  -- they exist: never for internal rooms.
  select coalesce(jsonb_agg(jsonb_build_object('event_id', e.id, 'seq', e.seq)), '[]'::jsonb) into v_refs
    from public.room_events e
   where e.room_id = p_room_id and e.id = any(coalesce(p_source_event_ids,'{}'))
     and not public.sr_room_is_internal(v_room.kind);
  return public.append_room_event(v_room.parent_room_id, p_client_msg_id, p_actor_organization_id, 'room.summary_shared',
    jsonb_build_object('text', v_text,
      'from_room_id', case when public.sr_room_is_internal(v_room.kind) then null else v_room.id end,
      'from_room_name', case when public.sr_room_is_internal(v_room.kind) then null else v_room.name end,
      'sources', v_refs));
end; $$;

-- 8. File review and independent confirmation ---------------------------------

create or replace function public.sr_request_file_review(
  p_file_version_id uuid, p_actor_organization_id uuid, p_client_msg_id uuid, p_note text default null)
returns public.room_events language plpgsql security definer set search_path = public, extensions as $$
declare v_f public.room_file_versions; v_event public.room_events; v_role text;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select * into v_f from public.room_file_versions where id = p_file_version_id;
  if found then v_role := public.sr_room_role(v_f.room_id, p_actor_organization_id); end if;
  if v_role is null then raise exception 'room_access_denied' using errcode = '42501'; end if;
  if v_role = 'viewer' then raise exception 'room_write_denied' using errcode = '42501'; end if;
  v_event := public.append_room_event(v_f.room_id, p_client_msg_id, p_actor_organization_id, 'file.review_requested',
    jsonb_build_object('file_version_id', v_f.id, 'logical_name', v_f.logical_name, 'version_no', v_f.version_no,
      'sha256', v_f.sha256, 'note', public.sr_clean_name(p_note, 1000)));
  -- One open task per other organization in the room, bound to this exact version.
  insert into public.needs_you(room_id, source_event_id, title, detail, priority, target_organization_id)
  select v_f.room_id, v_event.id, 'Review ' || v_f.logical_name || ' v' || v_f.version_no,
         'file_version:' || v_f.id::text, 'normal', o.org
    from (select distinct rm.acting_organization_id as org from public.room_members rm
           where rm.room_id = v_f.room_id and rm.removed_at is null
             and rm.acting_organization_id <> p_actor_organization_id) o
   where not exists (select 1 from public.needs_you n
                      where n.room_id = v_f.room_id and n.target_organization_id = o.org
                        and n.detail = 'file_version:' || v_f.id::text and n.status = 'open');
  return v_event;
end; $$;

create or replace function public.sr_record_confirmation(
  p_room_id uuid,
  p_actor_organization_id uuid,
  p_client_msg_id uuid,
  p_decision text,
  p_file_version_id uuid default null,
  p_file_sha256 text default null,
  p_proposal_id uuid default null,
  p_comment text default null)
returns public.room_confirmations language plpgsql security definer set search_path = public, extensions as $$
declare
  v_role text := public.sr_room_role(p_room_id, p_actor_organization_id);
  v_f public.room_file_versions;
  v_event public.room_events;
  v_row public.room_confirmations;
  v_existing uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if v_role is null then raise exception 'room_access_denied' using errcode = '42501'; end if;
  if v_role = 'viewer' then raise exception 'room_write_denied' using errcode = '42501'; end if;
  if p_decision not in ('confirmed','changes_requested') then raise exception 'invalid_decision' using errcode = '22023'; end if;
  if (p_file_version_id is null) = (p_proposal_id is null) then raise exception 'exactly_one_subject_required' using errcode = '22023'; end if;

  if p_file_version_id is not null then
    select * into v_f from public.room_file_versions where id = p_file_version_id and room_id = p_room_id;
    if not found then raise exception 'file_version_not_in_room' using errcode = '42501'; end if;
    if p_file_sha256 is null or lower(p_file_sha256) <> v_f.sha256 then
      raise exception 'file_hash_mismatch' using errcode = '22023';
    end if;
  elsif not exists (select 1 from public.staging_proposals where id = p_proposal_id and room_id = p_room_id) then
    raise exception 'proposal_not_in_room' using errcode = '42501';
  end if;

  -- Idempotent retry of the same client action.
  select e.id into v_existing from public.room_events e where e.room_id = p_room_id and e.client_msg_id = p_client_msg_id;
  if v_existing is not null then
    select * into v_row from public.room_confirmations where source_event_id = v_existing;
    if found then return v_row; end if;
  end if;

  v_event := public.append_room_event(p_room_id, p_client_msg_id, p_actor_organization_id, 'confirmation.recorded',
    jsonb_strip_nulls(jsonb_build_object(
      'decision', p_decision, 'file_version_id', p_file_version_id, 'sha256', v_f.sha256,
      'logical_name', v_f.logical_name, 'version_no', v_f.version_no,
      'proposal_id', p_proposal_id, 'comment', public.sr_clean_name(p_comment, 2000))));

  insert into public.room_confirmations(room_id, subject_type, file_version_id, file_sha256, proposal_id,
    organization_id, user_id, decision, comment, source_event_id)
  values (p_room_id, case when p_file_version_id is not null then 'file_version' else 'proposal' end,
    p_file_version_id, v_f.sha256, p_proposal_id, p_actor_organization_id, auth.uid(), p_decision,
    public.sr_clean_name(p_comment, 2000), v_event.id)
  returning * into v_row;

  if p_file_version_id is not null then
    update public.needs_you set status = 'done', resolved_at = now(), resolved_by_user_id = auth.uid()
     where room_id = p_room_id and target_organization_id = p_actor_organization_id
       and detail = 'file_version:' || p_file_version_id::text and status = 'open';
  end if;
  return v_row;
end; $$;

-- 9. Evidence export with confirmations --------------------------------------
create or replace function public.sr_export_room_evidence(p_room_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = public, pg_temp as $$
begin
  return public.export_room_evidence(p_room_id) || jsonb_build_object(
    'schema', 'sourcerating-room-evidence-v2',
    'confirmations', (select coalesce(jsonb_agg(to_jsonb(c) || jsonb_build_object(
          'organization_name', (select name from public.organizations o where o.id = c.organization_id))
        order by c.created_at, c.id), '[]'::jsonb)
      from public.room_confirmations c where c.room_id = p_room_id),
    'members', (select coalesce(jsonb_agg(jsonb_build_object(
          'user_id', m.user_id, 'organization_id', m.acting_organization_id, 'display_name', m.member_display_name,
          'room_role', m.room_role, 'joined_at', m.joined_at, 'removed_at', m.removed_at) order by m.joined_at), '[]'::jsonb)
      from public.room_members m where m.room_id = p_room_id));
end; $$;

-- 10. Grants ------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'sr_org_role(uuid)','sr_room_role(uuid,uuid)',
    'sr_create_organization(text,text)','sr_create_project(uuid,text,text,text)',
    'sr_create_invite(uuid,uuid,text,text,text,text,integer)','sr_preview_invite(text)',
    'sr_accept_invite(text,uuid,text,text)','sr_revoke_invite(uuid)',
    'sr_create_sub_room(uuid,uuid,text,text,text,uuid[])',
    'sr_add_room_member(uuid,uuid,uuid,uuid,text)','sr_remove_room_member(uuid,uuid,uuid)',
    'sr_remove_org_member(uuid,uuid)','sr_mark_room_read(uuid,bigint)',
    'sr_share_to_parent(uuid,uuid,uuid,text,uuid[])',
    'sr_request_file_review(uuid,uuid,uuid,text)',
    'sr_record_confirmation(uuid,uuid,uuid,text,uuid,text,uuid,text)',
    'sr_export_room_evidence(uuid)']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- Rollback (manual, only while no v2 data exists):
--   drop function public.sr_* (all listed above); drop table public.room_confirmations;
--   alter table public.room_members drop column last_read_seq;
--   alter table public.organization_memberships drop column display_name;
--   alter table public.rooms drop column parent_room_id, drop column purpose;
--   alter table public.project_invites drop column target_organization_name, drop column project_role;
--   restore the four original CHECK lists from 202609250001 / 202609260007.
