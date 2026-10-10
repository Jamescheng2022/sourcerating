-- Inquiry review is a bounded action; table UPDATE remains unavailable to clients.
alter table public.project_inquiries
  add column submitter_organization_name text,
  add column acknowledged_at timestamptz;

create function public.set_inquiry_submitter_organization()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select o.name into new.submitter_organization_name
  from public.room_members rm join public.organizations o on o.id = rm.acting_organization_id
  join public.organization_memberships om on om.organization_id = o.id and om.user_id = rm.user_id
  where rm.room_id = new.room_id and rm.user_id = new.submitted_by_user_id
    and rm.removed_at is null and om.removed_at is null
  order by o.id limit 1;
  return new;
end;
$$;
revoke all on function public.set_inquiry_submitter_organization() from public, anon, authenticated;
create trigger inquiry_submitter_organization before insert on public.project_inquiries
for each row execute function public.set_inquiry_submitter_organization();

create function public.acknowledge_project_inquiry(p_needs_you_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_task public.needs_you;
begin
  if auth.uid() is null then
    raise exception 'inquiry_review_denied' using errcode = '42501';
  end if;
  select * into v_task from public.needs_you where id = p_needs_you_id for update;
  if not found or v_task.inquiry_id is null or not exists (
    select 1 from public.rooms r
    join public.room_members rm on rm.room_id = r.id
    where r.id = v_task.room_id and r.owner_organization_id = v_task.target_organization_id
      and rm.user_id = auth.uid() and rm.acting_organization_id = r.owner_organization_id
      and rm.removed_at is null and public.is_org_member(r.owner_organization_id)
  ) then
    raise exception 'inquiry_review_denied' using errcode = '42501';
  end if;
  if v_task.status = 'done' then return jsonb_build_object('ok', true); end if;
  if v_task.status <> 'open' then
    raise exception 'inquiry_review_denied' using errcode = '42501';
  end if;
  update public.needs_you set status = 'done', resolved_at = now(), resolved_by_user_id = auth.uid()
    where id = v_task.id;
  update public.project_inquiries set acknowledged_at = now()
    where id = v_task.inquiry_id and room_id = v_task.room_id;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.acknowledge_project_inquiry(uuid) from public, anon, authenticated;
grant execute on function public.acknowledge_project_inquiry(uuid) to authenticated;
