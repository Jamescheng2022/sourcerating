-- One statement snapshot, caller RLS, no service key or signed download URLs.
create or replace function public.export_room_evidence(p_room_id uuid)
returns jsonb
language plpgsql stable security invoker
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_room_member(p_room_id) then
    raise exception 'Room access denied' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'schema', 'sourcerating-room-evidence-v1',
    'exported_at', statement_timestamp(),
    'scope', 'Room conversation, file metadata and decision history; file bytes are not included.',
    'room', (select to_jsonb(r) from public.rooms r where r.id = p_room_id),
    'events', (select coalesce(jsonb_agg(to_jsonb(e) order by e.seq), '[]'::jsonb) from public.room_events e where e.room_id = p_room_id),
    'files', (select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at, f.id), '[]'::jsonb) from public.room_file_versions f where f.room_id = p_room_id),
    'proposals', (select coalesce(jsonb_agg(to_jsonb(p) order by p.created_at, p.id), '[]'::jsonb) from public.staging_proposals p where p.room_id = p_room_id),
    'canonical_objects', (select coalesce(jsonb_agg(to_jsonb(c) order by c.committed_at, c.id), '[]'::jsonb) from public.canonical_objects c where c.room_id = p_room_id),
    'needs_you', (select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at, n.id), '[]'::jsonb) from public.needs_you n where n.room_id = p_room_id)
  );
end;
$$;
revoke all on function public.export_room_evidence(uuid) from public, anon;
grant execute on function public.export_room_evidence(uuid) to authenticated;
