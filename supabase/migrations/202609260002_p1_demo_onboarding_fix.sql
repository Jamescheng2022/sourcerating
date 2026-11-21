-- Fix P1 demo onboarding ambiguity in PL/pgSQL table-returning function.
create or replace function public.claim_p1_demo_role(p_role text)
returns table (
  organization_id uuid,
  project_id uuid,
  shared_room_id uuid,
  internal_room_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_buyer_org constant uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_supplier_org constant uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  v_project constant uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  v_shared_room constant uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  v_internal_room constant uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  v_org uuid;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if p_role not in ('buyer','supplier') then
    raise exception 'invalid_demo_role';
  end if;

  insert into public.organizations (id, name, slug)
  values
    (v_buyer_org, 'P1 Buyer Demo Org', 'p1-buyer-demo'),
    (v_supplier_org, 'P1 Supplier Demo Org', 'p1-supplier-demo')
  on conflict on constraint organizations_pkey do nothing;

  insert into public.projects (id, owner_organization_id, name, code)
  values (v_project, v_buyer_org, 'Bangkok Prefab Office - P1 Live Demo', 'P1-LIVE-001')
  on conflict on constraint projects_pkey do nothing;

  insert into public.project_participants (project_id, organization_id, project_role)
  values
    (v_project, v_buyer_org, 'buyer'),
    (v_project, v_supplier_org, 'supplier')
  on conflict on constraint project_participants_pkey do nothing;

  insert into public.rooms (id, project_id, kind, name, owner_organization_id, counterpart_organization_id)
  values
    (v_shared_room, v_project, 'supplier_external', 'EastFrame Steel - Shared', v_buyer_org, v_supplier_org),
    (v_internal_room, v_project, 'buyer_internal', 'Buyer Internal', v_buyer_org, null)
  on conflict on constraint rooms_pkey do nothing;

  v_org := case when p_role = 'buyer' then v_buyer_org else v_supplier_org end;

  insert into public.organization_memberships (organization_id, user_id, role, removed_at)
  values (v_org, v_user, 'member', null)
  on conflict on constraint organization_memberships_pkey
  do update set removed_at = null;

  insert into public.room_members (room_id, user_id, acting_organization_id, room_role, removed_at)
  values (v_shared_room, v_user, v_org, 'member', null)
  on conflict on constraint room_members_pkey
  do update set removed_at = null;

  if p_role = 'buyer' then
    insert into public.room_members (room_id, user_id, acting_organization_id, room_role, removed_at)
    values (v_internal_room, v_user, v_org, 'member', null)
    on conflict on constraint room_members_pkey
    do update set removed_at = null;
  end if;

  insert into public.audit_log (
    actor_user_id, actor_organization_id, project_id, action, target_type, target_id, metadata
  )
  values (
    v_user, v_org, v_project, 'p1_demo.role_claimed', 'organization', v_org::text,
    jsonb_build_object('demo_role', p_role)
  );

  return query select v_org, v_project, v_shared_room, v_internal_room;
end;
$$;

revoke all on function public.claim_p1_demo_role(text) from public, anon;
grant execute on function public.claim_p1_demo_role(text) to authenticated;