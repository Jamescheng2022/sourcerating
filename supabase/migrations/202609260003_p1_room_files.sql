-- P1 real room attachments: private Supabase Storage + version/evidence registry.

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'room-files',
  'room-files',
  false,
  52428800,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'image/png',
    'image/jpeg'
  ]::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.room_file_versions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  logical_name text not null,
  version_no integer not null check (version_no >= 1),
  bucket_id text not null default 'room-files',
  object_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  sha256 text not null check (char_length(sha256) = 64),
  uploader_user_id uuid not null references auth.users(id) on delete restrict,
  uploader_organization_id uuid not null references public.organizations(id) on delete restrict,
  source_event_id uuid references public.room_events(id) on delete set null,
  supersedes_version_id uuid references public.room_file_versions(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (room_id, logical_name, version_no)
);

create index if not exists room_file_versions_room_created_idx
  on public.room_file_versions(room_id, created_at desc);
create index if not exists room_file_versions_room_name_version_idx
  on public.room_file_versions(room_id, logical_name, version_no desc);
create index if not exists room_file_versions_source_event_idx
  on public.room_file_versions(source_event_id)
  where source_event_id is not null;

alter table public.room_file_versions enable row level security;

drop policy if exists room_file_versions_select on public.room_file_versions;
create policy room_file_versions_select
on public.room_file_versions
for select
to authenticated
using (public.is_room_member(room_id));

-- Browser uploads are allowed only into a folder whose first path segment is
-- an authorized room_id. No UPDATE/DELETE policy is granted in P1.
drop policy if exists sourcerating_room_files_insert on storage.objects;
create policy sourcerating_room_files_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'room-files'
  and array_length(storage.foldername(name), 1) >= 1
  and public.is_room_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists sourcerating_room_files_select on storage.objects;
create policy sourcerating_room_files_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'room-files'
  and array_length(storage.foldername(name), 1) >= 1
  and public.is_room_member(((storage.foldername(name))[1])::uuid)
);

create or replace function public.register_room_file_version(
  p_room_id uuid,
  p_object_path text,
  p_file_name text,
  p_mime_type text,
  p_size_bytes bigint,
  p_sha256 text,
  p_actor_organization_id uuid,
  p_client_msg_id uuid
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

  -- Idempotent registration if the message RPC is retried.
  select *
  into v_existing_event
  from public.room_events e
  where e.room_id = p_room_id
    and e.client_msg_id = p_client_msg_id;

  if found then
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

  -- The upload must already exist and must have been written by this user.
  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'room-files'
      and o.name = p_object_path
      and o.owner = auth.uid()
      and (storage.foldername(o.name))[1] = p_room_id::text
  ) then
    raise exception 'uploaded_object_not_found_or_not_owned' using errcode = '42501';
  end if;

  -- Serialize same-name version assignment inside the same room.
  perform pg_advisory_xact_lock(
    hashtextextended(p_room_id::text || '|' || v_logical_name, 0)
  );

  select *
  into v_supersedes
  from public.room_file_versions f
  where f.room_id = p_room_id
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
      'supersedes_version_id', v_supersedes.id
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
  uuid, text, text, text, bigint, text, uuid, uuid
) from public, anon;
grant execute on function public.register_room_file_version(
  uuid, text, text, text, bigint, text, uuid, uuid
) to authenticated;