-- P1 security/performance hardening after first cloud lint pass.

revoke execute on function public.is_org_member(uuid) from anon;
revoke execute on function public.is_room_member(uuid) from anon;
revoke execute on function public.can_view_project(uuid) from anon;
revoke execute on function public.append_room_event(uuid, uuid, uuid, text, jsonb) from anon;

-- Explicit deny policy documents that event_outbox is worker-only while silencing
-- "RLS enabled without policy" ambiguity in automated review.
drop policy if exists event_outbox_no_client_access on public.event_outbox;
create policy event_outbox_no_client_access on public.event_outbox
for all to anon, authenticated
using (false)
with check (false);

-- Cover foreign-key and high-frequency authorization/join paths.
create index if not exists projects_owner_org_idx
  on public.projects(owner_organization_id);
create index if not exists rooms_project_idx
  on public.rooms(project_id);
create index if not exists rooms_owner_org_idx
  on public.rooms(owner_organization_id);
create index if not exists rooms_counterpart_org_idx
  on public.rooms(counterpart_organization_id)
  where counterpart_organization_id is not null;
create index if not exists room_members_acting_org_idx
  on public.room_members(acting_organization_id, room_id)
  where removed_at is null;
create index if not exists room_events_actor_user_idx
  on public.room_events(actor_user_id, room_id, seq);
create index if not exists room_events_actor_org_idx
  on public.room_events(actor_organization_id, room_id, seq);
create index if not exists event_outbox_room_idx
  on public.event_outbox(room_id, id);
create index if not exists audit_log_actor_user_idx
  on public.audit_log(actor_user_id, created_at desc)
  where actor_user_id is not null;
create index if not exists audit_log_actor_org_idx
  on public.audit_log(actor_organization_id, created_at desc)
  where actor_organization_id is not null;
create index if not exists audit_log_project_idx
  on public.audit_log(project_id, created_at desc)
  where project_id is not null;
create index if not exists audit_log_room_idx
  on public.audit_log(room_id, created_at desc)
  where room_id is not null;