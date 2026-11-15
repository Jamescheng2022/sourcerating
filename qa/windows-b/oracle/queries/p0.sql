-- Independent P0 oracle. Read-only SELECTs only. Locked before the P0 journey runs. Live pg mode only.
-- Scope: the project created by the four-persona journey, named exactly  "QA P0 {{STAMP}}".
-- Fixture identity is by content hash (lib/fixtures.cjs), never by file name: Rev0={{SHA_REV0}} Rev1={{SHA_REV1}} Rev2={{SHA_REV2}}.
-- Typed probe messages must be exactly  "P0T-<n> 12mm M20 USD 1,200"  for n = 1..30 (each n exactly once).
-- Database facts only. UI facts (badge text "historical", key-by-key typing, receiver view, AI answer, React #185)
-- are judged from screenshots / trace / console.jsonl per acceptance/criteria-p0.json, never from this file.
with scope_p as (select id from public.projects where name = 'QA P0 {{STAMP}}'),
scope_r as (select r.* from public.rooms r join scope_p p on p.id = r.project_id),
ev as (select e.* from public.room_events e join scope_r r on r.id = e.room_id),
fv as (select f.* from public.room_file_versions f join scope_r r on r.id = f.room_id),
r0 as (select * from fv where sha256 = '{{SHA_REV0}}'),
r1 as (select * from fv where sha256 = '{{SHA_REV1}}'),
r2 as (select * from fv where sha256 = '{{SHA_REV2}}'),
revs as (select * from r0 union all select * from r1 union all select * from r2),
later as (select * from r1 union all select * from r2),
cf as (select c.*, se.seq conf_seq, se.event_type conf_event_type, se.actor_organization_id conf_event_org, se.payload conf_payload from public.room_confirmations c join scope_r r on r.id = c.room_id left join public.room_events se on se.id = c.source_event_id and se.room_id = c.room_id),
-- every posted message that looks like any part of a probe (catches loss of the first character, e.g. "0T-3 ...", "2mm", "20 USD")
probe as (select payload->>'text' t from ev where event_type = 'message.posted' and payload->>'text' ~* '(T-[0-9]|[0-9]mm|M[0-9]{2}|USD)' and payload->>'text' not in ('P0 unread probe {{STAMP}}', 'P0 bolt size is M16', 'Correction: P0 bolt size is M20, not M16')),
good as (select t, substring(t from '^P0T-([0-9]+) ')::int n from probe where t ~ '^P0T-[0-9]+ 12mm M20 USD 1,200$'),
rr as (select room_id, payload->>'file_version_id' v, actor_user_id u, created_at, seq from ev where event_type = 'file.review_requested')
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
-- P0-01 / P0-05 approval history
union all select 'p0.confirm.rev0_distinct_confirming_orgs', (select count(distinct c.organization_id) from cf c join r0 on r0.id = c.file_version_id where c.decision = 'confirmed')::text
union all select 'p0.confirm.without_valid_source_event', (select count(*) from cf c where c.conf_seq is null or c.conf_event_type is distinct from 'confirmation.recorded' or c.conf_event_org is distinct from c.organization_id
  or (c.conf_payload->>'file_version_id') is distinct from c.file_version_id::text or (c.conf_payload->>'sha256') is distinct from c.file_sha256 or (c.conf_payload->>'decision') is distinct from c.decision)::text
-- a confirmation of Rev1/Rev2 counts as inherited unless it was recorded by its own event strictly after that version's upload event and is bound to that version's hash
union all select 'p0.confirm.inherited_by_new_version', (select count(*) from cf c join later v on v.id = c.file_version_id left join public.room_events fe on fe.id = v.source_event_id and fe.room_id = v.room_id where fe.seq is null or c.conf_seq is null or c.conf_seq <= fe.seq or c.file_sha256 is distinct from v.sha256
  or (c.conf_payload->>'file_version_id') is distinct from v.id::text or (c.conf_payload->>'sha256') is distinct from v.sha256)::text
-- Rev0 history must remain: its confirmations still exist and are still bound to the Rev0 hash after Rev1/Rev2 exist
union all select 'p0.confirm.rev0_history_rebound', (select count(*) from cf c join r0 on r0.id = c.file_version_id where c.file_sha256 is distinct from r0.sha256 or (c.conf_payload->>'sha256') is distinct from r0.sha256)::text
union all select 'p0.confirm.change_requests_with_reason', (select count(*) from cf c where c.decision = 'changes_requested' and coalesce(btrim(c.comment), '') <> '')::text
union all select 'p0.confirm.change_request_without_reason', (select count(*) from cf c where c.decision <> 'confirmed' and coalesce(btrim(c.comment), '') = '')::text
union all select 'p0.review.requests', (select count(*) from rr)::text
-- double-click duplicate: same user, same version, two review requests within 5 seconds
union all select 'p0.review.double_click_duplicates', (select count(*) from rr a join rr b on a.room_id = b.room_id and a.v = b.v and a.u = b.u and a.seq < b.seq and b.created_at - a.created_at < interval '5 seconds')::text
-- P0-03 own unread: the product computes unread = rooms.last_seq - room_members.last_read_seq (apps/web/src/app/project-room-b/use-real.ts:123),
-- so an own event above the member's read cursor is an own unread on reload. The visible badge is judged from browser evidence.
union all select 'p0.unread.members_with_own_events', (select count(*) from public.room_members m join scope_r r on r.id = m.room_id where m.removed_at is null and exists (select 1 from ev where ev.room_id = m.room_id and ev.actor_user_id = m.user_id))::text
union all select 'p0.unread.own_events_counted_unread', (select count(*) from public.room_members m join scope_r r on r.id = m.room_id join ev on ev.room_id = m.room_id and ev.actor_user_id = m.user_id where m.removed_at is null and ev.seq > m.last_read_seq)::text
-- P0-04 typed text integrity: 30 distinct probes n=1..30, each exactly once, nothing malformed
union all select 'p0.text.probe_distinct_n_1_30', (select count(distinct n) from good where n between 1 and 30)::text
union all select 'p0.text.probe_duplicates', (select count(*) from (select n from good group by n having count(*) > 1) d)::text
union all select 'p0.text.malformed_probe_messages', (select count(*) from probe where t !~ '^P0T-[0-9]+ 12mm M20 USD 1,200$')::text
-- event log integrity for the P0 project
union all select 'p0.events.seq_contiguous_violations', (select count(*) from scope_r r where r.last_seq <> coalesce((select max(seq) from ev where ev.room_id = r.id), 0) or (select count(*) from ev where ev.room_id = r.id) <> r.last_seq)::text
union all select 'p0.events.hash_chain_breaks', (select count(*) from (select seq, prev_hash, lag(content_hash) over (partition by room_id order by seq) lp from ev) c where seq > 1 and prev_hash is distinct from lp)::text
union all select 'p0.events.duplicate_client_msg', (select count(*) from (select room_id, client_msg_id from ev group by 1, 2 having count(*) > 1) d)::text
order by 1;
