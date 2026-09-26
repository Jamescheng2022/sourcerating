-- P1 privacy hardening: project membership must not reveal unrelated suppliers.

drop policy if exists organizations_select on public.organizations;
create policy organizations_select
on public.organizations
for select
to authenticated
using (
  public.is_org_member(id)
  or exists (
    select 1
    from public.rooms r
    join public.room_members rm
      on rm.room_id = r.id
     and rm.user_id = auth.uid()
     and rm.removed_at is null
    where (r.owner_organization_id = organizations.id
       or r.counterpart_organization_id = organizations.id)
      and public.is_org_member(rm.acting_organization_id)
  )
);

drop policy if exists project_participants_select on public.project_participants;
create policy project_participants_select
on public.project_participants
for select
to authenticated
using (
  public.is_org_member(organization_id)
  or exists (
    select 1
    from public.projects p
    where p.id = project_participants.project_id
      and public.is_org_member(p.owner_organization_id)
  )
  or exists (
    select 1
    from public.rooms r
    join public.room_members rm
      on rm.room_id = r.id
     and rm.user_id = auth.uid()
     and rm.removed_at is null
    where r.project_id = project_participants.project_id
      and (
        project_participants.organization_id = r.owner_organization_id
        or project_participants.organization_id = r.counterpart_organization_id
      )
      and public.is_org_member(rm.acting_organization_id)
  )
);