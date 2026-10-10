-- Sender display comes from active server-owned memberships, never event payload
-- or editable Auth user_metadata. Existing events/digests are not rewritten.
alter table public.room_members add column member_display_name text
  check (member_display_name is null or length(btrim(member_display_name)) between 1 and 120);
alter table public.room_events add column actor_display_name text,
  add column actor_organization_name text;
create function public.enforce_room_event_sender()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_name text; v_org text;
begin
  if auth.uid() is null or new.actor_user_id is distinct from auth.uid()
    or new.payload ?| array['who','org','actor_display_name','actor_organization_name'] then
    raise exception 'sender_identity_denied' using errcode = '42501';
  end if;
  select coalesce(rm.member_display_name, 'Member ' || left(rm.user_id::text,8)), o.name
    into v_name, v_org
  from public.room_members rm join public.organizations o on o.id = rm.acting_organization_id
  join public.organization_memberships om on om.organization_id = o.id and om.user_id = rm.user_id
  where rm.room_id = new.room_id and rm.user_id = auth.uid()
    and rm.acting_organization_id = new.actor_organization_id
    and rm.removed_at is null and om.removed_at is null;
  if not found then raise exception 'sender_identity_denied' using errcode = '42501'; end if;
  new.actor_display_name := v_name;
  new.actor_organization_name := v_org;
  return new;
end;
$$;
revoke all on function public.enforce_room_event_sender() from public, anon, authenticated;
create trigger room_event_sender before insert on public.room_events
for each row execute function public.enforce_room_event_sender();

-- Direct event/member updates remain RLS-denied. Snapshot labels cannot be edited.
create function public.preserve_room_event_sender()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.actor_user_id is distinct from old.actor_user_id
    or new.actor_organization_id is distinct from old.actor_organization_id
    or new.actor_display_name is distinct from old.actor_display_name
    or new.actor_organization_name is distinct from old.actor_organization_name then
    raise exception 'sender_identity_immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.preserve_room_event_sender() from public, anon, authenticated;
create trigger room_event_sender_immutable before update on public.room_events
for each row execute function public.preserve_room_event_sender();

create or replace function public.reserve_invite_bootstrap(p_invite_id uuid)
returns boolean language sql security definer set search_path = '' as $$
  select exists (select 1 from public.project_invites i where i.id = p_invite_id
    and i.invited_email is not null and i.used_at is null and i.revoked_at is null and i.expires_at > now());
$$;

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

  if v_email is null or length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invite_email_required' using errcode = '22023';
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

  if v_invite.invited_email is null then
    raise exception 'bound_invite_required' using errcode = '42501';
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
