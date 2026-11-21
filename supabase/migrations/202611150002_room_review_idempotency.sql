-- Preserve one event and one task set for each review intent.
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
  if p_client_msg_id is null then raise exception 'client_message_id_required' using errcode = '22023'; end if;
  -- Serialize same-key retries before append_room_event's existing-event check.
  perform pg_advisory_xact_lock(hashtextextended(v_f.room_id::text || '::review::' || p_client_msg_id::text, 0));
  select * into v_event from public.room_events
   where room_id = v_f.room_id and client_msg_id = p_client_msg_id;
  if found then
    if v_event.event_type <> 'file.review_requested'
       or v_event.actor_user_id is distinct from auth.uid()
       or v_event.actor_organization_id is distinct from p_actor_organization_id
       or v_event.payload->>'file_version_id' is distinct from v_f.id::text
       or v_event.payload->>'note' is distinct from public.sr_clean_name(p_note, 1000) then
      raise exception 'idempotency_conflict' using errcode = '22023';
    end if;
    return v_event;
  end if;
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
