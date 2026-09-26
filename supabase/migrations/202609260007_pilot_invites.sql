-- Pilot invite flow: Buyer creates a supplier room invitation; invitee self-creates
-- a confirmed Supabase account, signs in, then claims the invitation through RLS-safe RPCs.

create table if not exists public.project_invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  project_id uuid not null references public.projects(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  target_organization_id uuid not null references public.organizations(id) on delete cascade,
  invited_role text not null check (invited_role in ('supplier','provider','buyer_member')),
  invited_email text,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_by_organization_id uuid not null references public.organizations(id) on delete restrict,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by_user_id uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists project_invites_room_idx on public.project_invites(room_id, created_at desc);
create index if not exists project_invites_project_idx on public.project_invites(project_id, created_at desc);
create index if not exists project_invites_expiry_idx on public.project_invites(expires_at)
  where used_at is null and revoked_at is null;

alter table public.project_invites enable row level security;

drop policy if exists project_invites_creator_select on public.project_invites;
create policy project_invites_creator_select
on public.project_invites
for select
to authenticated
using (
  created_by_user_id = auth.uid()
  or public.is_org_member(created_by_organization_id)
);

create or replace function public.create_supplier_room_invite(
  p_project_id uuid,
  p_supplier_organization_name text,
  p_invited_email text default null,
  p_expires_in_hours integer default 168
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_project public.projects;
  v_supplier_org_id uuid := gen_random_uuid();
  v_room_id uuid := gen_random_uuid();
  v_invite_id uuid := gen_random_uuid();
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_token_hash text := encode(digest(v_token, 'sha256'), 'hex');
  v_supplier_name text := trim(p_supplier_organization_name);
  v_slug text;
  v_email text := nullif(lower(trim(coalesce(p_invited_email, ''))), '');
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if v_supplier_name is null or char_length(v_supplier_name) < 2 or char_length(v_supplier_name) > 160 then
    raise exception 'invalid_supplier_organization_name';
  end if;

  if p_expires_in_hours < 1 or p_expires_in_hours > 720 then
    raise exception 'invalid_invite_expiry';
  end if;

  select * into v_project
  from public.projects
  where id = p_project_id;

  if not found then
    raise exception 'project_not_found';
  end if;

  if not public.is_org_member(v_project.owner_organization_id) then
    raise exception 'project_owner_membership_required' using errcode = '42501';
  end if;

  v_slug := 'supplier-' || substr(replace(v_supplier_org_id::text, '-', ''), 1, 12);

  insert into public.organizations(id, name, slug)
  values (v_supplier_org_id, v_supplier_name, v_slug);

  insert into public.project_participants(project_id, organization_id, project_role)
  values (p_project_id, v_supplier_org_id, 'supplier');

  insert into public.rooms(
    id, project_id, kind, name, owner_organization_id, counterpart_organization_id
  )
  values (
    v_room_id,
    p_project_id,
    'supplier_external',
    v_supplier_name || ' - Shared',
    v_project.owner_organization_id,
    v_supplier_org_id
  );

  insert into public.room_members(
    room_id, user_id, acting_organization_id, room_role
  )
  values (
    v_room_id,
    auth.uid(),
    v_project.owner_organization_id,
    'admin'
  );

  insert into public.project_invites(
    id,
    token_hash,
    project_id,
    room_id,
    target_organization_id,
    invited_role,
    invited_email,
    created_by_user_id,
    created_by_organization_id,
    expires_at
  )
  values (
    v_invite_id,
    v_token_hash,
    p_project_id,
    v_room_id,
    v_supplier_org_id,
    'supplier',
    v_email,
    auth.uid(),
    v_project.owner_organization_id,
    now() + make_interval(hours => p_expires_in_hours)
  );

  insert into public.audit_log(
    actor_user_id,
    actor_organization_id,
    project_id,
    room_id,
    action,
    target_type,
    target_id,
    metadata
  )
  values (
    auth.uid(),
    v_project.owner_organization_id,
    p_project_id,
    v_room_id,
    'project_invite.created',
    'project_invite',
    v_invite_id::text,
    jsonb_build_object(
      'supplier_organization_name', v_supplier_name,
      'invited_email', v_email,
      'expires_in_hours', p_expires_in_hours
    )
  );

  return jsonb_build_object(
    'invite_id', v_invite_id,
    'token', v_token,
    'project_id', p_project_id,
    'room_id', v_room_id,
    'target_organization_id', v_supplier_org_id,
    'target_organization_name', v_supplier_name,
    'invited_email', v_email,
    'expires_at', now() + make_interval(hours => p_expires_in_hours)
  );
end;
$$;

revoke all on function public.create_supplier_room_invite(uuid,text,text,integer) from public, anon;
grant execute on function public.create_supplier_room_invite(uuid,text,text,integer) to authenticated;

create or replace function public.claim_project_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text := encode(digest(p_token, 'sha256'), 'hex');
  v_invite public.project_invites;
  v_email text := lower(coalesce(auth.jwt()->>'email',''));
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select *
  into v_invite
  from public.project_invites
  where token_hash = v_hash
  for update;

  if not found then
    raise exception 'invite_not_found' using errcode = '42501';
  end if;

  if v_invite.revoked_at is not null then
    raise exception 'invite_revoked' using errcode = '42501';
  end if;

  if v_invite.used_at is not null then
    if v_invite.used_by_user_id = auth.uid() then
      return jsonb_build_object(
        'project_id', v_invite.project_id,
        'room_id', v_invite.room_id,
        'acting_organization_id', v_invite.target_organization_id,
        'role', v_invite.invited_role,
        'idempotent', true
      );
    end if;
    raise exception 'invite_already_used' using errcode = '42501';
  end if;

  if v_invite.expires_at <= now() then
    raise exception 'invite_expired' using errcode = '42501';
  end if;

  if v_invite.invited_email is not null
     and lower(v_invite.invited_email) <> v_email then
    raise exception 'invite_email_mismatch' using errcode = '42501';
  end if;

  insert into public.organization_memberships(
    organization_id, user_id, role, removed_at
  )
  values (
    v_invite.target_organization_id,
    auth.uid(),
    'member',
    null
  )
  on conflict (organization_id, user_id)
  do update set removed_at = null;

  insert into public.room_members(
    room_id, user_id, acting_organization_id, room_role, removed_at
  )
  values (
    v_invite.room_id,
    auth.uid(),
    v_invite.target_organization_id,
    'member',
    null
  )
  on conflict (room_id, user_id, acting_organization_id)
  do update set removed_at = null;

  update public.project_invites
  set used_at = now(),
      used_by_user_id = auth.uid()
  where id = v_invite.id;

  insert into public.audit_log(
    actor_user_id,
    actor_organization_id,
    project_id,
    room_id,
    action,
    target_type,
    target_id,
    metadata
  )
  values (
    auth.uid(),
    v_invite.target_organization_id,
    v_invite.project_id,
    v_invite.room_id,
    'project_invite.claimed',
    'project_invite',
    v_invite.id::text,
    jsonb_build_object('invited_role', v_invite.invited_role)
  );

  return jsonb_build_object(
    'project_id', v_invite.project_id,
    'room_id', v_invite.room_id,
    'acting_organization_id', v_invite.target_organization_id,
    'role', v_invite.invited_role,
    'idempotent', false
  );
end;
$$;

revoke all on function public.claim_project_invite(text) from public, anon;
grant execute on function public.claim_project_invite(text) to authenticated;