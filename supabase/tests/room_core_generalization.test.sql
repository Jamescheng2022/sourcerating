-- Real-Postgres acceptance for 202611130001 (RLS on, role=authenticated, JWT claims per user).
-- Run inside a transaction that is rolled back; synthetic users only.
begin;
create or replace function pg_temp.as_user(p uuid, p_email text) returns void language plpgsql as $$
begin
  perform set_config('role','postgres',true);
  perform set_config('request.jwt.claims', json_build_object('sub',p,'email',p_email,'role','authenticated')::text, true);
  perform set_config('role','authenticated',true);
end $$;
create or replace function pg_temp.denied(p_sql text, p_expect text) returns void language plpgsql as $$
begin
  begin execute p_sql; exception when others then
    if sqlerrm not like '%'||p_expect||'%' then raise exception 'expected % got %', p_expect, sqlerrm; end if; return; end;
  raise exception 'expected denial % for: %', p_expect, p_sql;
end $$;
do $$
declare
  a1 uuid := gen_random_uuid(); a2 uuid := gen_random_uuid(); b1 uuid := gen_random_uuid(); b2 uuid := gen_random_uuid();
  orgA uuid; orgB uuid; pA jsonb; pB jsonb; roomA uuid; roomB uuid; inv jsonb; sub jsonb; subInt jsonb;
  f2 uuid; f3 uuid; ev public.room_events; n int; ex jsonb; c public.room_confirmations;
begin
  insert into auth.users(id,email) values (a1,'a1@a.test'),(a2,'a2@a.test'),(b1,'b1@b.test'),(b2,'b2@b.test');

  -- T1 two-way: A creates, invites B; B keeps its OWN pre-existing organization
  perform pg_temp.as_user(a1,'a1@a.test');
  orgA := (public.sr_create_organization('Org A','Alice')->>'organization_id')::uuid;
  pA := public.sr_create_project(orgA,'Factory build','buyer'); roomA := (pA->>'main_room_id')::uuid;
  inv := public.sr_create_invite(roomA, orgA, 'b1@b.test', 'organization', 'Org B', 'supplier');
  perform pg_temp.as_user(b1,'b1@b.test');
  orgB := (public.sr_create_organization('Org B','Bob')->>'organization_id')::uuid;
  select count(*) into n from public.rooms; assert n = 0, 'B sees no room before accepting';
  perform public.sr_accept_invite(inv->>'token', orgB, null, null);
  select count(*) into n from public.rooms where id = roomA; assert n = 1, 'B sees room after accepting';
  perform public.append_room_event(roomA, gen_random_uuid(), orgB, 'message.posted', '{"text":"hello from B"}');
  perform pg_temp.as_user(a1,'a1@a.test');
  perform public.append_room_event(roomA, gen_random_uuid(), orgA, 'message.posted', '{"text":"hello from A"}');
  select count(*) into n from public.room_events where room_id = roomA; assert n = 2, 'both messages persisted';
  -- wrong email cannot use a token; reverse direction works with the same functions
  perform pg_temp.as_user(b1,'b1@b.test');
  pB := public.sr_create_project(orgB,'Reverse project','supplier'); roomB := (pB->>'main_room_id')::uuid;
  inv := public.sr_create_invite(roomB, orgB, 'a1@a.test', 'organization', null, 'buyer');
  perform pg_temp.as_user(a2,'a2@a.test');
  perform pg_temp.denied(format('select public.sr_accept_invite(%L,null,%L,null)', inv->>'token','X org'), 'invite_email_mismatch');
  perform pg_temp.as_user(a1,'a1@a.test');
  perform public.sr_accept_invite(inv->>'token', orgA, null, null);
  select count(*) into n from public.rooms where id = roomB; assert n = 1, 'A joined B''s project';
  raise notice 'T1 two-way projects PASS';

  -- colleagues join their own organizations
  inv := public.sr_create_invite(roomA, orgA, 'a2@a.test', 'org_member');
  perform pg_temp.as_user(a2,'a2@a.test'); perform public.sr_accept_invite(inv->>'token', null, null, 'Amy');
  perform pg_temp.as_user(b1,'b1@b.test');
  inv := public.sr_create_invite(roomA, orgB, 'b2@b.test', 'org_member');
  perform pg_temp.as_user(b2,'b2@b.test'); perform public.sr_accept_invite(inv->>'token', null, null, 'Ben');

  -- T2 sub rooms
  perform pg_temp.as_user(a1,'a1@a.test');
  sub := public.sr_create_sub_room(roomA, orgA, 'Logistics', 'Shipping and customs', 'external', array[b1]);
  subInt := public.sr_create_sub_room(roomA, orgA, 'A internal', null, 'internal', array[a2]);
  perform pg_temp.denied(format('select public.sr_create_sub_room(%L,%L,%L,null,%L,array[%L]::uuid[])', roomA, orgA, 'bad', 'internal', b1), 'internal_room_is_single_organization');
  perform pg_temp.denied(format('select public.sr_create_sub_room(%L,%L,%L,null,%L,array[%L]::uuid[])', roomA, orgA, 'bad', 'external', gen_random_uuid()), 'member_not_eligible');
  perform public.append_room_event((sub->>'room_id')::uuid, gen_random_uuid(), orgA, 'message.posted', '{"text":"vessel booked"}');
  perform public.append_room_event((subInt->>'room_id')::uuid, gen_random_uuid(), orgA, 'message.posted', '{"text":"our floor price is 14.2"}');
  select count(*) into n from public.room_events where room_id = roomA; assert n = 2, 'sub room messages did not leak to main';
  ev := public.sr_share_to_parent((sub->>'room_id')::uuid, orgA, gen_random_uuid(), 'Logistics: vessel booked, ETA 28 Nov', '{}');
  assert ev.room_id = roomA and ev.event_type = 'room.summary_shared', 'summary lands in main room';
  ev := public.sr_share_to_parent((subInt->>'room_id')::uuid, orgA, gen_random_uuid(), 'We accept the quote', '{}');
  assert ev.payload->>'from_room_id' is null, 'internal room identity is not exposed upward';
  -- T5 isolation
  perform pg_temp.as_user(b1,'b1@b.test');
  select count(*) into n from public.rooms where id = (subInt->>'room_id')::uuid; assert n = 0, 'B cannot see A internal room';
  select count(*) into n from public.room_events where room_id = (subInt->>'room_id')::uuid; assert n = 0, 'B cannot read A internal messages';
  select count(*) into n from public.rooms where id = (sub->>'room_id')::uuid; assert n = 1, 'B (member) sees logistics room';
  perform pg_temp.as_user(b2,'b2@b.test');
  select count(*) into n from public.rooms where id = (sub->>'room_id')::uuid; assert n = 0, 'B2 (not added) cannot see logistics sub room';
  perform pg_temp.denied(format('select public.append_room_event(%L,gen_random_uuid(),%L,%L,%L)', sub->>'room_id', orgB, 'message.posted', '{}'), 'room_access_denied');
  raise notice 'T2 sub rooms + T5 room isolation PASS';

  -- T3 file versions and independent confirmations (version rows inserted as the platform would)
  perform set_config('role','postgres',true);
  insert into public.room_file_versions(room_id,logical_name,version_no,object_path,mime_type,size_bytes,sha256,uploader_user_id,uploader_organization_id)
  values (roomA,'ep600.pdf',1,roomA||'/v1','application/pdf',10,repeat('1',64),b1,orgB),
         (roomA,'ep600.pdf',2,roomA||'/v2','application/pdf',11,repeat('2',64),b1,orgB);
  select id into f2 from public.room_file_versions where room_id=roomA and version_no=2;
  perform pg_temp.as_user(b1,'b1@b.test');
  perform public.sr_request_file_review(f2, orgB, gen_random_uuid(), 'thickness 20 to 22');
  perform pg_temp.as_user(a1,'a1@a.test');
  select count(*) into n from public.needs_you where room_id=roomA and status='open'; assert n = 1, 'A has an open review task';
  perform pg_temp.denied(format('select public.sr_record_confirmation(%L,%L,gen_random_uuid(),%L,%L,%L)', roomA, orgA, 'confirmed', f2, repeat('9',64)), 'file_hash_mismatch');
  c := public.sr_record_confirmation(roomA, orgA, gen_random_uuid(), 'confirmed', f2, repeat('2',64), null, 'OK for A');
  select count(*) into n from public.room_confirmations where file_version_id=f2 and decision='confirmed'; assert n = 1, 'only A has confirmed so far';
  select count(*) into n from public.needs_you where room_id=roomA and status='open'; assert n = 0, 'A task closed';
  perform pg_temp.as_user(b1,'b1@b.test');
  perform public.sr_record_confirmation(roomA, orgB, gen_random_uuid(), 'confirmed', f2, repeat('2',64));
  select count(distinct organization_id) into n from public.room_confirmations where file_version_id=f2 and decision='confirmed'; assert n = 2, 'two organizations confirmed independently';
  perform set_config('role','postgres',true);
  insert into public.room_file_versions(room_id,logical_name,version_no,object_path,mime_type,size_bytes,sha256,uploader_user_id,uploader_organization_id,supersedes_version_id)
  values (roomA,'ep600.pdf',3,roomA||'/v3','application/pdf',12,repeat('3',64),b1,orgB,f2) returning id into f3;
  select count(*) into n from public.room_confirmations where file_version_id=f3; assert n = 0, 'v3 inherits no confirmation';
  select count(*) into n from public.room_confirmations where file_version_id=f2; assert n = 2, 'v2 confirmations remain';
  perform pg_temp.as_user(a1,'a1@a.test');
  perform pg_temp.denied(format('select public.sr_record_confirmation(%L,%L,gen_random_uuid(),%L,%L,%L)', roomA, orgA, 'confirmed', f3, repeat('2',64)), 'file_hash_mismatch');
  perform pg_temp.denied(format('insert into public.room_confirmations(room_id,subject_type,file_version_id,file_sha256,organization_id,user_id,decision) values (%L,%L,%L,%L,%L,%L,%L)', roomA,'file_version',f3,repeat('3',64),orgB,a1,'confirmed'), 'permission denied');
  raise notice 'T3 version-bound independent confirmation PASS';

  -- T4 evidence export is consistent with the tables
  ex := public.sr_export_room_evidence(roomA);
  assert jsonb_array_length(ex->'confirmations') = 2 and jsonb_array_length(ex->'files') = 3, 'export carries files and confirmations';
  assert (select bool_and(x->>'file_sha256' = repeat('2',64) and x->>'organization_name' in ('Org A','Org B')) from jsonb_array_elements(ex->'confirmations') x), 'hash and organization match';
  assert jsonb_array_length(ex->'events') = (select count(*) from public.room_events where room_id=roomA), 'every raw event exported';
  raise notice 'T4 evidence export PASS';

  -- T5 revocation
  perform public.sr_remove_room_member((sub->>'room_id')::uuid, orgA, b1);
  perform pg_temp.as_user(b1,'b1@b.test');
  select count(*) into n from public.room_events where room_id=(sub->>'room_id')::uuid; assert n = 0, 'removed room member loses history';
  perform public.sr_remove_org_member(orgB, b2);
  perform pg_temp.as_user(b2,'b2@b.test');
  select count(*) into n from public.rooms; assert n = 0, 'removed organization member loses every room';
  perform pg_temp.denied(format('select public.sr_export_room_evidence(%L)', roomA), 'Room access denied');
  perform pg_temp.as_user(a2,'a2@a.test');
  perform pg_temp.denied(format('select public.sr_remove_org_member(%L,%L)', orgA, a1), 'organization_admin_required');
  raise notice 'T5 revocation PASS';
end $$;
rollback;
