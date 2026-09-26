-- P1 file integrity verification state.
alter table public.room_file_versions
  add column if not exists verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','rejected')),
  add column if not exists server_sha256 text,
  add column if not exists detected_mime_type text,
  add column if not exists verified_at timestamptz,
  add column if not exists rejection_reason text;

-- Existing P1 synthetic fixtures predate server verification. Mark them verified
-- so historic demo attachments remain readable; all new files begin as pending.
update public.room_file_versions
set verification_status = 'verified',
    server_sha256 = coalesce(server_sha256, sha256),
    detected_mime_type = coalesce(detected_mime_type, mime_type),
    verified_at = coalesce(verified_at, now())
where verified_at is null;

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

create index if not exists room_file_versions_verification_idx
  on public.room_file_versions(verification_status, created_at)
  where verification_status <> 'verified';