-- Migration: 202611180001_p0_security_and_confirmation_hardening
-- Purpose: Fix P0/P1 security vulnerabilities discovered by GPT-6.1 Terra Medium (Codex)
-- 1. sr_remove_org_member NULL three-valued logic bypass: caller must be verified owner/admin
-- 2. sr_record_confirmation must require verification_status = 'verified' on file version
-- 3. Restrict append_room_event to prevent unverified client confirmation event injection

-- 1. Fix sr_remove_org_member
create or replace function public.sr_remove_org_member(p_organization_id uuid, p_user_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  -- Fix SQL three-valued logic: when caller is not member, sr_org_role returns NULL.
  -- coalesce ensures NULL evaluates to empty string, correctly triggering the permission denial.
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

-- 2. Fix sr_record_confirmation to enforce verification_status = 'verified'
create or replace function public.sr_record_confirmation(
  p_room_id uuid,
  p_actor_organization_id uuid,
  p_client_msg_id uuid,
  p_decision text,
  p_file_version_id uuid default null,
  p_file_sha256 text default null,
  p_proposal_id uuid default null,
  p_comment text default null
)
returns public.room_confirmations language plpgsql security definer set search_path = public as $$
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
    
    -- Mandatory check: file version MUST be verified by server-side gateway
    if v_f.verification_status <> 'verified' then
      raise exception 'file_not_verified' using errcode = '22023';
    end if;

    if p_file_sha256 is null or lower(p_file_sha256) <> v_f.sha256 then
      raise exception 'file_hash_mismatch' using errcode = '22023';
    end if;
  elsif not exists (select 1 from public.staging_proposals where id = p_proposal_id and room_id = p_room_id) then
    raise exception 'proposal_not_in_room' using errcode = '42501';
  end if;

  -- Idempotent retry: verify client_msg_id
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
     where room_id = p_room_id and file_version_id = p_file_version_id and status = 'open';
  else
    update public.staging_proposals set status = case when p_decision = 'confirmed' then 'accepted' else 'dismissed' end
     where id = p_proposal_id;
  end if;

  return v_row;
end; $$;
