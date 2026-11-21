-- 202611180003_consolidate_security_and_close_overloads_rollback.sql
-- Rollback for 202611180003_consolidate_security_and_close_overloads.sql

grant execute on function public.append_room_event(uuid, uuid, uuid, text, jsonb) to authenticated;
drop function if exists public.sr_post_room_message(uuid, uuid, uuid, jsonb);

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
      and public.is_room_member(v.room_id)
  )
);
