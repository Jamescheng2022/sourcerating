-- Independent oracle. Read-only: only SELECTs and a temp probe function that is rolled back.
-- Scope: projects created by the synthetic run  "QA Factory 11140406"  and  "QA Reverse 11140406".
-- Output: one row per check: (check_id, actual) — compared with expectations.json by the evaluator.
create or replace function pg_temp.rls_probe() returns table(pairs int, nonmember_leaks int, member_blind int) language plpgsql as $f$
declare r record; n int; leaks int := 0; blind int := 0; total int := 0; ev int;
begin
  for r in
    select u.user_id, rm.room_id, (exists (select 1 from public.room_members m join public.organization_memberships om on om.user_id = m.user_id and om.organization_id = m.acting_organization_id and om.removed_at is null where m.room_id = rm.room_id and m.user_id = u.user_id and m.removed_at is null)) as is_member
    from (select distinct m.user_id from public.room_members m join public.rooms x on x.id = m.room_id join public.projects p on p.id = x.project_id where p.name in ('QA Factory 11140406','QA Reverse 11140406')) u
    cross join (select x.id as room_id from public.rooms x join public.projects p on p.id = x.project_id where p.name in ('QA Factory 11140406','QA Reverse 11140406')) rm
  loop
    total := total + 1;
    perform set_config('request.jwt.claims', json_build_object('sub', r.user_id, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', r.user_id::text, true);
    execute 'set local role authenticated';
    select (select count(*) from public.room_events e where e.room_id = r.room_id)
         + (select count(*) from public.room_file_versions f where f.room_id = r.room_id)
         + (select count(*) from public.rooms x where x.id = r.room_id) into ev;
    execute 'reset role';
    if not r.is_member and ev > 0 then leaks := leaks + 1; end if;
    if r.is_member and ev = 0 then blind := blind + 1; end if;
  end loop;
  return query select total, leaks, blind;
end $f$;

with scope_p as (select id, name from public.projects where name in ('QA Factory 11140406','QA Reverse 11140406')),
scope_r as (select r.* from public.rooms r join scope_p p on p.id = r.project_id),
ev as (select e.* from public.room_events e join scope_r r on r.id = e.room_id),
fv as (select f.* from public.room_file_versions f join scope_r r on r.id = f.room_id),
main_orgs as (select distinct r.project_id, m.acting_organization_id org from scope_r r join public.room_members m on m.room_id = r.id where r.kind = 'main')
select 'scope.projects' check_id, (select count(*) from scope_p)::text actual
union all select 'scope.rooms', (select count(*) from scope_r)::text
union all select 'events.seq_contiguous_violations', (select count(*) from scope_r r where r.last_seq <> coalesce((select max(seq) from ev where ev.room_id = r.id), 0) or coalesce((select count(*) from ev where ev.room_id = r.id), 0) <> r.last_seq)::text
union all select 'events.duplicate_client_msg', (select count(*) from (select room_id, client_msg_id from ev group by 1, 2 having count(*) > 1) d)::text
union all select 'events.hash_chain_breaks', (select count(*) from (select seq, prev_hash, lag(content_hash) over (partition by room_id order by seq) lp from ev) c where seq > 1 and prev_hash is distinct from lp)::text
union all select 'files.not_verified', (select count(*) from fv where verification_status <> 'verified')::text
union all select 'files.sha_mismatch', (select count(*) from fv where server_sha256 is distinct from sha256)::text
union all select 'files.version_gaps', (select count(*) from (select room_id, logical_name, max(version_no) mx, count(*) c, min(version_no) mn from fv group by 1, 2) g where g.mn <> 1 or g.mx <> g.c)::text
union all select 'files.object_missing', (select count(*) from fv where not exists (select 1 from storage.objects o where o.bucket_id = fv.bucket_id and o.name = fv.object_path))::text
union all select 'files.versions_total', (select count(*) from fv)::text
union all select 'confirm.hash_not_bound_to_version', (select count(*) from public.room_confirmations c join scope_r r on r.id = c.room_id left join public.room_file_versions f on f.id = c.file_version_id where c.subject_type = 'file_version' and (f.id is null or f.sha256 <> c.file_sha256 or f.room_id <> c.room_id))::text
union all select 'confirm.without_event', (select count(*) from public.room_confirmations c join scope_r r on r.id = c.room_id where c.source_event_id is null)::text
union all select 'confirm.org_not_in_project', (select count(*) from public.room_confirmations c join scope_r r on r.id = c.room_id where not exists (select 1 from main_orgs mo where mo.project_id = r.project_id and mo.org = c.organization_id))::text
union all select 'state.ep600_v2_distinct_confirming_orgs', (select count(distinct c.organization_id) from public.room_confirmations c join fv on fv.id = c.file_version_id where fv.logical_name = 'ep600.pdf' and fv.version_no = 2 and c.decision = 'confirmed' and fv.room_id in (select id from scope_r where kind = 'main' and project_id in (select id from scope_p where name = 'QA Factory 11140406')))::text
union all select 'state.ep600_latest_version_confirmations', (select count(*) from public.room_confirmations c join fv on fv.id = c.file_version_id where fv.logical_name = 'ep600.pdf' and fv.version_no = (select max(version_no) from fv f2 where f2.room_id = fv.room_id and f2.logical_name = 'ep600.pdf') and fv.room_id in (select id from scope_r where kind = 'main' and project_id in (select id from scope_p where name = 'QA Factory 11140406')))::text
union all select 'state.ep600_latest_version_no', (select max(version_no) from fv where logical_name = 'ep600.pdf')::text
union all select 'state.restored_version_has_original_bytes', (select count(*) from fv v4 join fv v1 on v1.room_id = v4.room_id and v1.logical_name = v4.logical_name and v1.version_no = 1 where v4.version_no = 4 and v4.supersedes_version_id is not null and v4.sha256 = v1.sha256)::text
union all select 'isolation.internal_room_multi_org', (select count(*) from scope_r r where r.kind = 'internal' and (select count(distinct m.acting_organization_id) from public.room_members m where m.room_id = r.id and m.removed_at is null) > 1)::text
union all select 'isolation.internal_foreign_author', (select count(*) from ev join scope_r r on r.id = ev.room_id where r.kind = 'internal' and ev.actor_organization_id <> r.owner_organization_id)::text
union all select 'isolation.member_org_outside_project', (select count(*) from public.room_members m join scope_r r on r.id = m.room_id where m.removed_at is null and not exists (select 1 from main_orgs mo where mo.project_id = r.project_id and mo.org = m.acting_organization_id))::text
union all select 'isolation.subroom_text_copied_to_main', (select count(*) from ev em join scope_r rm on rm.id = em.room_id and rm.kind = 'main' join scope_r rs on rs.project_id = rm.project_id and rs.parent_room_id = rm.id join ev es on es.room_id = rs.id where em.event_type = 'message.posted' and es.event_type = 'message.posted' and em.payload->>'text' = es.payload->>'text')::text
union all select 'isolation.events_after_member_removed', (select count(*) from ev join public.room_members m on m.room_id = ev.room_id and m.user_id = ev.actor_user_id where m.removed_at is not null and ev.created_at > m.removed_at and ev.event_type not in ('member.removed'))::text
union all select 'offline.m1_exactly_once', (select count(*) from ev where event_type = 'message.posted' and payload->>'text' = 'offline-m1 11140406')::text
union all select 'offline.m2_exactly_once', (select count(*) from ev where event_type = 'message.posted' and payload->>'text' = 'offline-m2 11140406')::text
union all select 'offline.m3_exactly_once', (select count(*) from ev where event_type = 'message.posted' and payload->>'text' = 'offline-m3 11140406')::text
union all select 'offline.order_m2_before_m3_violations', (select count(*) from ev a join ev b on a.room_id = b.room_id where a.payload->>'text' = 'offline-m2 11140406' and b.payload->>'text' = 'offline-m3 11140406' and a.seq > b.seq)::text
union all select 'rls.pairs_probed', (select pairs from pg_temp.rls_probe())::text
union all select 'rls.nonmember_leaks', (select nonmember_leaks from pg_temp.rls_probe())::text
union all select 'rls.member_cannot_read_own_room', (select member_blind from pg_temp.rls_probe())::text
order by 1;
