-- 202611180003_consolidate_security_and_close_overloads.sql
-- Final Security & Integrity Consolidation for Release A:
-- 1. Explicitly drop all previous overloads of sr_record_confirmation
-- 2. Define single authoritative sr_record_confirmation (7 params, file only, no proposal bypass, idempotency check, exact needs_you closure)
-- 3. Dedicated sr_clean_message_text (preserves newlines \n and tabs \t)
-- 4. Dedicated sr_post_room_message RPC (enforces non-viewer, validates reply_to UUID format and room membership)
-- 5. Revoke execute on append_room_event from public/anon/authenticated
-- 6. Hardened Storage policy: verification_status = 'verified'
-- 7. Fix sr_remove_org_member & sr_accept_invite SQL three-valued NULL logic

-- 1. Explicitly drop all historical overloads
drop function if exists public.sr_record_confirmation(uuid, uuid, uuid, text, uuid, text, uuid, text);
drop function if exists public.sr_record_confirmation(uuid, uuid, uuid, text, text, uuid, text, uuid);
drop function if exists public.sr_record_confirmation(uuid, uuid, uuid, uuid, text, uuid, text, text);
drop function if exists public.sr_record_confirmation(uuid, uuid, uuid, text, uuid, text, text);

-- 2. Message text cleaner that strictly preserves newlines (\n) and tabs (\t)
create or replace function public.sr_clean_message_text(p_text text, p_max integer default 10000)
returns text language sql immutable as $$
  select nullif(left(btrim(regexp_replace(coalesce(p_text, ''), '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g')), p_max), '');
$$;

-- 3. Authoritative single sr_record_confirmation RPC
create or replace function public.sr_record_confirmation(
  p_room_id uuid,
  p_actor_organization_id uuid,
  p_client_msg_id uuid,
  p_decision text,
  p_file_version_id uuid,
  p_file_sha256 text,
  p_comment text default null
)
returns public.room_confirmations
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_role text;
  v_f public.room_file_versions;
  v_event public.room_events;
  v_row public.room_confirmations;
  v_existing uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if p_decision not in ('confirmed', 'changes_requested') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;

  if p_file_version_id is null then
    raise exception 'file_version_id_required' using errcode = '22023';
  end if;

  -- 2-argument signature: sr_room_role(p_room_id, p_org_id)
  v_role := public.sr_room_role(p_room_id, p_actor_organization_id);
  if v_role is null or v_role = 'viewer' then
    raise exception 'confirmation_permission_denied' using errcode = '42501';
  end if;

  select * into v_f
    from public.room_file_versions
   where id = p_file_version_id and room_id = p_room_id;
  if not found then
    raise exception 'file_version_not_in_room' using errcode = '42501';
  end if;

  -- Mandatory gateway check: file must be verified
  if v_f.verification_status <> 'verified' then
    raise exception 'file_not_verified' using errcode = '22023';
  end if;

  if p_file_sha256 is null or lower(p_file_sha256) <> lower(v_f.sha256) then
    raise exception 'file_hash_mismatch' using errcode = '22023';
  end if;

  -- Idempotent retry: verify client_msg_id
  select e.id into v_existing
    from public.room_events e
   where e.room_id = p_room_id and e.client_msg_id = p_client_msg_id;
  if v_existing is not null then
    select * into v_row from public.room_confirmations where source_event_id = v_existing;
    if found then
      if v_row.file_version_id = p_file_version_id and v_row.decision = p_decision then
        return v_row;
      else
        raise exception 'idempotency_conflict' using errcode = '23505';
      end if;
    end if;
    raise exception 'client_msg_id_already_used' using errcode = '23505';
  end if;

  v_event := public.append_room_event(
    p_room_id,
    p_client_msg_id,
    p_actor_organization_id,
    'confirmation.recorded',
    jsonb_strip_nulls(jsonb_build_object(
      'decision', p_decision,
      'file_version_id', p_file_version_id,
      'sha256', v_f.sha256,
      'logical_name', v_f.logical_name,
      'version_no', v_f.version_no,
      'comment', public.sr_clean_message_text(p_comment, 2000)
    ))
  );

  insert into public.room_confirmations(
    room_id, subject_type, file_version_id, file_sha256, proposal_id,
    organization_id, user_id, decision, comment, source_event_id
  )
  values (
    p_room_id, 'file_version', p_file_version_id, v_f.sha256, null,
    p_actor_organization_id, auth.uid(), p_decision,
    public.sr_clean_message_text(p_comment, 2000), v_event.id
  )
  returning * into v_row;

  -- Match exact open review task by detail ('file_version:' || id) and target organization
  update public.needs_you
     set status = 'done', resolved_at = now(), resolved_by_user_id = auth.uid()
   where room_id = p_room_id
     and detail = 'file_version:' || p_file_version_id::text
     and target_organization_id = p_actor_organization_id
     and status = 'open';

  return v_row;
end; $$;

-- 4. Dedicated sr_post_room_message RPC
create or replace function public.sr_post_room_message(
  p_room_id uuid,
  p_client_msg_id uuid,
  p_actor_organization_id uuid,
  p_payload jsonb
)
returns public.room_events
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_role text;
  v_text text;
  v_reply_to text;
  v_cleaned_payload jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  v_role := public.sr_room_role(p_room_id, p_actor_organization_id);
  if v_role is null then
    raise exception 'room_access_denied' using errcode = '42501';
  end if;
  if v_role = 'viewer' then
    raise exception 'viewer_cannot_post_message' using errcode = '42501';
  end if;

  v_text := p_payload->>'text';
  if v_text is null or length(trim(v_text)) = 0 then
    raise exception 'message_text_required' using errcode = '22023';
  end if;

  v_cleaned_payload := jsonb_build_object(
    'text', public.sr_clean_message_text(v_text, 10000)
  );

  if p_payload ? 'reply_to' and (p_payload->>'reply_to') is not null then
    v_reply_to := p_payload->>'reply_to';
    if v_reply_to !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'invalid_reply_to_uuid' using errcode = '22023';
    end if;
    if not exists (select 1 from public.room_events where id = v_reply_to::uuid and room_id = p_room_id) then
      raise exception 'reply_to_event_not_in_room' using errcode = '42501';
    end if;
    v_cleaned_payload := v_cleaned_payload || jsonb_build_object('reply_to', v_reply_to);
  end if;

  return public.append_room_event(
    p_room_id,
    p_client_msg_id,
    p_actor_organization_id,
    'message.posted',
    v_cleaned_payload
  );
end; $$;

-- 5. Fix sr_remove_org_member NULL logic
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
  update public.organization_memberships set removed_at = now()
   where organization_id = p_organization_id and user_id = p_user_id and removed_at is null;
  insert into public.audit_log(actor_user_id, actor_organization_id, action, target_type, target_id)
  values (auth.uid(), p_organization_id, 'organization_member.removed', 'user', p_user_id::text);
  return true;
end; $$;

-- 6. Fix sr_accept_invite NULL logic
create or replace function public.sr_accept_invite(
  p_invite_code text,
  p_organization_id uuid default null,
  p_new_organization_name text default null,
  p_member_display_name text default null
)
returns public.room_members
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_i public.room_invites;
  v_room public.rooms;
  v_org uuid;
  v_member public.room_members;
  v_display text;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  select * into v_i from public.room_invites where invite_code = p_invite_code and expires_at > now();
  if not found or v_i.status <> 'pending' then
    raise exception 'invalid_or_expired_invite' using errcode = '22023';
  end if;
  if v_i.invited_email is null or lower(v_i.invited_email) <> lower(coalesce(auth.jwt()->>'email','')) then
    raise exception 'invite_email_mismatch' using errcode = '42501';
  end if;
  select * into v_room from public.rooms where id = v_i.room_id;

  v_display := public.sr_clean_name(p_member_display_name, 120);

  if v_i.invited_role = 'org_member' then
    v_org := v_i.target_organization_id;
    insert into public.organization_memberships(organization_id, user_id, role, display_name)
    values (v_org, auth.uid(), 'member', v_display)
    on conflict (organization_id, user_id) do update
      set removed_at = null, display_name = coalesce(excluded.display_name, organization_memberships.display_name);
  else
    if p_organization_id is not null then
      if coalesce(public.sr_org_role(p_organization_id), '') not in ('owner','admin') then
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
  values (v_i.room_id, auth.uid(), v_org, coalesce(v_i.invited_role,'member'), coalesce(v_display, 'Member'))
  on conflict (room_id, user_id) do update
    set removed_at = null,
        acting_organization_id = excluded.acting_organization_id,
        member_display_name = coalesce(excluded.member_display_name, room_members.member_display_name)
  returning * into v_member;

  update public.room_invites
     set status = 'accepted', accepted_at = now(), accepted_by_user_id = auth.uid()
   where id = v_i.id;

  return v_member;
end; $$;

-- 7. Permissions
revoke execute on function public.append_room_event(uuid, uuid, uuid, text, jsonb) from authenticated;
revoke execute on function public.append_room_event(uuid, uuid, uuid, text, jsonb) from anon;
revoke execute on function public.append_room_event(uuid, uuid, uuid, text, jsonb) from public;
grant execute on function public.append_room_event(uuid, uuid, uuid, text, jsonb) to postgres, service_role;

grant execute on function public.sr_post_room_message(uuid, uuid, uuid, jsonb) to authenticated;
grant execute on function public.sr_record_confirmation(uuid, uuid, uuid, text, uuid, text, text) to authenticated;
grant execute on function public.sr_remove_org_member(uuid, uuid) to authenticated;
grant execute on function public.sr_accept_invite(text, uuid, text, text) to authenticated;

-- 8. Storage SELECT policy hardening
drop policy if exists sourcerating_room_files_select on storage.objects;
create policy sourcerating_room_files_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'room-files'
  and exists (
    select 1
    from public.room_file_versions v
    where v.object_path = storage.objects.name
      and v.room_id = ((storage.foldername(storage.objects.name))[1])::uuid
      and v.verification_status = 'verified'
      and public.is_room_member(v.room_id)
  )
);
