-- 202611180002_fix_confirmation_bypass_and_event_injection.sql
-- Security & Integrity Hardening for Release A:
-- 1. Eliminate proposal bypass in sr_record_confirmation (G4-P0-1)
--    Proposals MUST be reviewed via review_staging_proposal with needs_you assignment & canonical_objects insertion.
-- 2. Restrict direct append_room_event execution from authenticated clients (G4-P0-2)
--    Create dedicated sr_post_room_message RPC; revoke direct append_room_event from authenticated.

-- 1. Patch sr_record_confirmation: strictly allow file_version confirmations only.
create or replace function public.sr_record_confirmation(
  p_room_id uuid,
  p_client_msg_id uuid,
  p_actor_organization_id uuid,
  p_file_version_id uuid default null,
  p_file_sha256 text default null,
  p_proposal_id uuid default null,
  p_decision text default 'confirmed',
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
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_decision not in ('confirmed', 'changes_requested') then raise exception 'invalid_decision' using errcode = '22023'; end if;

  -- Block proposal bypass: proposals MUST use review_staging_proposal
  if p_proposal_id is not null then
    raise exception 'proposals_must_be_reviewed_via_review_staging_proposal' using errcode = '42501';
  end if;

  if p_file_version_id is null then
    raise exception 'file_version_id_required' using errcode = '22023';
  end if;

  v_role := public.sr_room_role(p_room_id, auth.uid(), p_actor_organization_id);
  if v_role is null or v_role = 'viewer' then raise exception 'confirmation_permission_denied' using errcode = '42501'; end if;

  select * into v_f from public.room_file_versions where id = p_file_version_id and room_id = p_room_id;
  if not found then raise exception 'file_version_not_in_room' using errcode = '42501'; end if;
  
  -- Mandatory check: file version MUST be verified by server-side gateway
  if v_f.verification_status <> 'verified' then
    raise exception 'file_not_verified' using errcode = '22023';
  end if;

  if p_file_sha256 is null or lower(p_file_sha256) <> lower(v_f.sha256) then
    raise exception 'file_hash_mismatch' using errcode = '22023';
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
      'comment', public.sr_clean_name(p_comment, 2000))));

  insert into public.room_confirmations(room_id, subject_type, file_version_id, file_sha256, proposal_id,
    organization_id, user_id, decision, comment, source_event_id)
  values (p_room_id, 'file_version',
    p_file_version_id, v_f.sha256, null, p_actor_organization_id, auth.uid(), p_decision,
    public.sr_clean_name(p_comment, 2000), v_event.id)
  returning * into v_row;

  update public.needs_you set status = 'done', resolved_at = now(), resolved_by_user_id = auth.uid()
   where room_id = p_room_id and file_version_id = p_file_version_id and status = 'open';

  return v_row;
end; $$;

-- 2. Create dedicated sr_post_room_message RPC for authenticated clients
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
  v_text text;
  v_cleaned_payload jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  v_text := p_payload->>'text';
  if v_text is null or length(trim(v_text)) = 0 then
    raise exception 'message_text_required' using errcode = '22023';
  end if;

  v_cleaned_payload := jsonb_build_object(
    'text', public.sr_clean_name(v_text, 10000)
  );

  if p_payload ? 'reply_to' and (p_payload->>'reply_to') is not null then
    v_cleaned_payload := v_cleaned_payload || jsonb_build_object('reply_to', p_payload->>'reply_to');
  end if;

  return public.append_room_event(
    p_room_id,
    p_client_msg_id,
    p_actor_organization_id,
    'message.posted',
    v_cleaned_payload
  );
end; $$;

-- 3. Restrict permissions: authenticated clients can only post messages through sr_post_room_message
revoke execute on function public.append_room_event(uuid, uuid, uuid, text, jsonb) from authenticated;
revoke execute on function public.append_room_event(uuid, uuid, uuid, text, jsonb) from anon;
revoke execute on function public.append_room_event(uuid, uuid, uuid, text, jsonb) from public;
grant execute on function public.append_room_event(uuid, uuid, uuid, text, jsonb) to postgres, service_role;

grant execute on function public.sr_post_room_message(uuid, uuid, uuid, jsonb) to authenticated;
grant execute on function public.sr_record_confirmation(uuid, uuid, uuid, uuid, text, uuid, text, text) to authenticated;
