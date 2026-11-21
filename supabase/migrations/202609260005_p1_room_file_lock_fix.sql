-- Fix advisory lock key: PostgreSQL text cannot contain NUL from chr(0).
create or replace function public.register_room_file_version(
  p_room_id uuid,
  p_object_path text,
  p_file_name text,
  p_mime_type text,
  p_size_bytes bigint,
  p_sha256 text,
  p_actor_organization_id uuid,
  p_client_msg_id uuid,
  p_caption text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, storage, extensions
as $$
declare
  v_existing_event public.room_events;
  v_existing_file public.room_file_versions;
  v_version_no integer;
  v_supersedes public.room_file_versions;
  v_file_id uuid := gen_random_uuid();
  v_event public.room_events;
  v_logical_name text := lower(trim(p_file_name));
  v_folders text[];
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if p_size_bytes < 0 or p_size_bytes > 52428800 then
    raise exception 'invalid_file_size';
  end if;

  if char_length(p_sha256) <> 64 or p_sha256 !~ '^[0-9a-fA-F]{64}$' then
    raise exception 'invalid_sha256';
  end if;

  if p_mime_type not in (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'image/png',
    'image/jpeg'
  ) then
    raise exception 'mime_type_not_allowed';
  end if;

  if p_file_name is null
     or char_length(trim(p_file_name)) < 1
     or char_length(p_file_name) > 200
     or p_file_name like '%/%'
     or p_file_name like E'%\\%'
     or p_file_name like '%..%'
     or p_file_name ~ '[[:cntrl:]]' then
    raise exception 'invalid_file_name';
  end if;

  if p_caption is not null and char_length(p_caption) > 2000 then
    raise exception 'caption_too_long';
  end if;

  if not public.is_room_member(p_room_id) then
    raise exception 'room_access_denied' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.room_members rm
    where rm.room_id = p_room_id
      and rm.user_id = auth.uid()
      and rm.acting_organization_id = p_actor_organization_id
      and rm.removed_at is null
  ) then
    raise exception 'acting_org_not_bound_to_room' using errcode = '42501';
  end if;

  select *
  into v_existing_event
  from public.room_events e
  where e.room_id = p_room_id
    and e.client_msg_id = p_client_msg_id;

  if found then
    if coalesce(v_existing_event.payload->>'object_path','') <> p_object_path
       or coalesce(v_existing_event.payload->>'sha256','') <> lower(p_sha256) then
      raise exception 'idempotency_conflict';
    end if;

    select *
    into v_existing_file
    from public.room_file_versions f
    where f.source_event_id = v_existing_event.id
    limit 1;

    if found then
      return jsonb_build_object(
        'file', to_jsonb(v_existing_file),
        'event', to_jsonb(v_existing_event),
        'idempotent', true
      );
    end if;
  end if;

  v_folders := storage.foldername(p_object_path);
  if array_length(v_folders, 1) <> 2
     or v_folders[1] <> p_room_id::text then
    raise exception 'invalid_object_path';
  end if;

  begin
    perform v_folders[2]::uuid;
  exception when others then
    raise exception 'invalid_upload_id';
  end;

  if storage.filename(p_object_path) <> p_file_name then
    raise exception 'filename_path_mismatch';
  end if;

  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'room-files'
      and o.name = p_object_path
      and o.owner_id = auth.uid()::text
      and (storage.foldername(o.name))[1] = p_room_id::text
  ) then
    raise exception 'uploaded_object_not_found_or_not_owned' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      p_room_id::text || '::' || p_actor_organization_id::text || '::' || v_logical_name,
      0
    )
  );

  select *
  into v_supersedes
  from public.room_file_versions f
  where f.room_id = p_room_id
    and f.uploader_organization_id = p_actor_organization_id
    and f.logical_name = v_logical_name
  order by f.version_no desc
  limit 1;

  v_version_no := coalesce(v_supersedes.version_no, 0) + 1;

  insert into public.room_file_versions (
    id,
    room_id,
    logical_name,
    version_no,
    bucket_id,
    object_path,
    mime_type,
    size_bytes,
    sha256,
    uploader_user_id,
    uploader_organization_id,
    supersedes_version_id
  )
  values (
    v_file_id,
    p_room_id,
    v_logical_name,
    v_version_no,
    'room-files',
    p_object_path,
    p_mime_type,
    p_size_bytes,
    lower(p_sha256),
    auth.uid(),
    p_actor_organization_id,
    v_supersedes.id
  )
  returning * into v_existing_file;

  select *
  into v_event
  from public.append_room_event(
    p_room_id,
    p_client_msg_id,
    p_actor_organization_id,
    'file.attached',
    jsonb_build_object(
      'file_version_id', v_file_id,
      'file_name', p_file_name,
      'logical_name', v_logical_name,
      'version_no', v_version_no,
      'mime_type', p_mime_type,
      'size_bytes', p_size_bytes,
      'sha256', lower(p_sha256),
      'bucket_id', 'room-files',
      'object_path', p_object_path,
      'supersedes_version_id', v_supersedes.id,
      'caption', nullif(trim(coalesce(p_caption,'')), '')
    )
  );

  update public.room_file_versions
  set source_event_id = v_event.id
  where id = v_file_id
  returning * into v_existing_file;

  return jsonb_build_object(
    'file', to_jsonb(v_existing_file),
    'event', to_jsonb(v_event),
    'idempotent', false
  );
end;
$$;

revoke all on function public.register_room_file_version(
  uuid, text, text, text, bigint, text, uuid, uuid, text
) from public, anon;
grant execute on function public.register_room_file_version(
  uuid, text, text, text, bigint, text, uuid, uuid, text
) to authenticated;