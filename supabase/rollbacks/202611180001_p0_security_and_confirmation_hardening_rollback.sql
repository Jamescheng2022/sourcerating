-- Rollback: 202611180001_p0_security_and_confirmation_hardening_rollback
-- Restores previous implementation from 202611130001_room_core_generalization

create or replace function public.sr_remove_org_member(p_organization_id uuid, p_user_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.sr_org_role(p_organization_id) not in ('owner','admin') then
    raise exception 'organization_admin_required' using errcode = '42501';
  end if;
  if exists (select 1 from public.organization_memberships
              where organization_id = p_organization_id and user_id = p_user_id and role = 'owner') then
    raise exception 'owner_cannot_be_removed' using errcode = '42501';
  end if;
  update public.organization_memberships set removed_at = now()
   where organization_id = p_organization_id and user_id = p_user_id and removed_at is null;
  insert into public.audit_log(actor_user_id, actor_organization_id, action, target_type, target_id)
  values (auth.uid(), p_organization_id, 'organization_member.removed', 'user', p_user_id::text);
  return true;
end; $$;
