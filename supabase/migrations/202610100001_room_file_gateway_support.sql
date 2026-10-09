-- Support for the rebuilt room-file-gateway Edge Function (L1 stage 2, 2026-10-10).
-- storage.objects is not exposed through the Data API, so the gateway needs a
-- narrow lookup to confirm an unregistered upload belongs to the caller before
-- cleanup_orphan deletes it. Callable by service_role only.

create or replace function public.room_file_orphan_object(p_object_path text)
returns table (owner_id text, registered boolean)
language sql
stable
security definer
set search_path = public, storage
as $$
  select
    o.owner_id,
    exists (
      select 1
      from public.room_file_versions v
      where v.object_path = o.name
    ) as registered
  from storage.objects o
  where o.bucket_id = 'room-files'
    and o.name = p_object_path;
$$;

revoke all on function public.room_file_orphan_object(text) from public, anon, authenticated;
grant execute on function public.room_file_orphan_object(text) to service_role;
