-- Independent P0 oracle. Read-only SELECTs only. Locked before the P0 journey runs.
-- Scope: the project created by the four-persona journey, named exactly  "QA P0 {{STAMP}}".
-- Fixture identity is by content hash (lib/fixtures.cjs), never by file name: Rev0={{SHA_REV0}} Rev1={{SHA_REV1}} Rev2={{SHA_REV2}}.
-- Typed probe messages must be exactly  "P0T-<n> 12mm M20 USD 1,200"  (n = 1..).
with scope_p as (select id from public.projects where name = 'QA P0 {{STAMP}}'),
scope_r as (select r.* from public.rooms r join scope_p p on p.id = r.project_id),
ev as (select e.* from public.room_events e join scope_r r on r.id = e.room_id),
fv as (select f.* from public.room_file_versions f join scope_r r on r.id = f.room_id),
r0 as (select * from fv where sha256 = '{{SHA_REV0}}'),
r1 as (select * from fv where sha256 = '{{SHA_REV1}}'),
r2 as (select * from fv where sha256 = '{{SHA_REV2}}'),
revs as (select * from r0 union all select * from r1 union all select * from r2),
cf as (select c.*, se.seq conf_seq from public.room_confirmations c join scope_r r on r.id = c.room_id left join public.room_events se on se.id = c.source_event_id),
probe as (select payload->>'text' t from ev where event_type = 'message.posted' and payload->>'text' ~ 'T-[0-9]+ ')
select 'p0.scope.projects' check_id, (select count(*) from scope_p)::text actual
union all select 'p0.files.rev0_count', (select count(*) from r0)::text
union all select 'p0.files.rev1_count', (select count(*) from r1)::text
union all select 'p0.files.rev2_count', (select count(*) from r2)::text
-- P0-01 lineage: renamed uploads stay one logical asset with contiguous versions and correct supersedes links
union all select 'p0.lineage.distinct_logical_assets', (select count(distinct (room_id, logical_name)) from revs)::text
union all select 'p0.lineage.rev1_supersedes_rev0', (select count(*) from r1 join r0 on r1.supersedes_version_id = r0.id and r1.room_id = r0.room_id and r1.logical_name = r0.logical_name and r1.version_no = r0.version_no + 1)::text
union all select 'p0.lineage.rev2_supersedes_rev1', (select count(*) from r2 join r1 on r2.supersedes_version_id = r1.id and r2.room_id = r1.room_id and r2.logical_name = r1.logical_name and r2.version_no = r1.version_no + 1)::text
union all select 'p0.lineage.version_gaps', (select count(*) from (select room_id, logical_name, max(version_no) mx, count(*) c, min(version_no) mn from fv group by 1, 2) g where g.mn <> 1 or g.mx <> g.c)::text
union all select 'p0.files.not_verified', (select count(*) from revs where verification_status <> 'verified' or server_sha256 is distinct from sha256)::text
union all select 'p0.files.object_missing', (select count(*) from revs v where not exists (select 1 from storage.objects o where o.bucket_id = v.bucket_id and o.name = v.object_path))::text
-- P0-01 / P0-05 approval history: Rev0 keeps two independent org confirmations; later versions inherit none
union all select 'p0.confirm.rev0_distinct_confirming_orgs', (select count(distinct c.organization_id) from cf c join r0 on r0.id = c.file_version_id where c.decision = 'confirmed')::text
union all select 'p0.confirm.inherited_by_new_version', (select count(*) from cf c join revs v on v.id = c.file_version_id join public.room_events fe on fe.id = v.source_event_id where c.conf_seq is null or c.conf_seq <= fe.seq or c.file_sha256 <> v.sha256)::text
union all select 'p0.confirm.change_request_without_reason', (select count(*) from cf c where c.decision <> 'confirmed' and coalesce(btrim(c.comment), '') = '')::text
union all select 'p0.confirm.duplicate_review_requests', (select count(*) from (select room_id, payload->>'file_version_id', actor_user_id from ev where event_type = 'file.review_requested' group by 1, 2, 3 having count(*) > 1) d)::text
-- P0-03 own unread: no active member has an unread counter covering their own latest event
union all select 'p0.unread.self_authored_unread', (select count(*) from public.room_members m join scope_r r on r.id = m.room_id where m.removed_at is null and m.last_read_seq < coalesce((select max(seq) from ev where ev.room_id = m.room_id and ev.actor_user_id = m.user_id), 0))::text
-- P0-04 typed text integrity
union all select 'p0.text.probe_messages', (select count(*) from probe where t ~ '^P0T-[0-9]+ 12mm M20 USD 1,200$')::text
union all select 'p0.text.malformed_probe_messages', (select count(*) from probe where t !~ '^P0T-[0-9]+ 12mm M20 USD 1,200$')::text
-- event log integrity for the P0 project
union all select 'p0.events.seq_contiguous_violations', (select count(*) from scope_r r where r.last_seq <> coalesce((select max(seq) from ev where ev.room_id = r.id), 0) or (select count(*) from ev where ev.room_id = r.id) <> r.last_seq)::text
union all select 'p0.events.hash_chain_breaks', (select count(*) from (select seq, prev_hash, lag(content_hash) over (partition by room_id order by seq) lp from ev) c where seq > 1 and prev_hash is distinct from lp)::text
union all select 'p0.events.duplicate_client_msg', (select count(*) from (select room_id, client_msg_id from ev group by 1, 2 having count(*) > 1) d)::text
order by 1;
