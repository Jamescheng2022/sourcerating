-- Run only against a disposable local database BEFORE the lineage migration.
-- The caller must wrap this fixture and the migration in one transaction, and
-- expect the migration to fail with room_file_lineage_requires_reconciliation.
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  org_a uuid; org_b uuid; room_id uuid;
begin
  insert into auth.users(id,email) values (a,'lineage-a@example.test'),(b,'lineage-b@example.test');
  perform set_config('request.jwt.claims',json_build_object('sub',a,'email','lineage-a@example.test','role','authenticated')::text,true);
  org_a := (public.sr_create_organization('Lineage A','A')->>'organization_id')::uuid;
  room_id := (public.sr_create_project(org_a,'Lineage fork','buyer')->>'main_room_id')::uuid;
  perform set_config('request.jwt.claims',json_build_object('sub',b,'email','lineage-b@example.test','role','authenticated')::text,true);
  org_b := (public.sr_create_organization('Lineage B','B')->>'organization_id')::uuid;
  insert into public.room_file_versions(room_id,logical_name,version_no,object_path,mime_type,size_bytes,sha256,uploader_user_id,uploader_organization_id)
  values
    (room_id,'fork.pdf',1,room_id||'/fork-a','application/pdf',1,repeat('a',64),a,org_a),
    (room_id,'fork.pdf',1,room_id||'/fork-b','application/pdf',1,repeat('b',64),b,org_b);
end $$;
