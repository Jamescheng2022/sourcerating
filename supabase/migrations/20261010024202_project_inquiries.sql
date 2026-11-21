-- Authenticated inquiry collection. No mail sender, webhook or AI dependency.
create table public.project_inquiries (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete restrict,
  submitted_by_user_id uuid not null references auth.users(id) on delete restrict,
  client_request_id uuid not null,
  subject text not null check (length(btrim(subject)) between 1 and 160),
  detail text not null check (length(btrim(detail)) between 1 and 8000),
  created_at timestamptz not null default now(),
  unique (submitted_by_user_id, client_request_id)
);
create index project_inquiries_room_created_idx on public.project_inquiries(room_id, created_at desc);
create index project_inquiries_submitter_created_idx on public.project_inquiries(submitted_by_user_id, created_at desc);
alter table public.project_inquiries enable row level security;
revoke all on public.project_inquiries from public, anon, authenticated;
grant select on public.project_inquiries to authenticated;
grant all on public.project_inquiries to service_role;

create policy project_inquiries_select on public.project_inquiries for select to authenticated
using (
  public.is_room_member(room_id)
  and (
    submitted_by_user_id = (select auth.uid())
    or exists (
      select 1 from public.rooms r
      where r.id = project_inquiries.room_id and public.is_org_member(r.owner_organization_id)
    )
  )
);

alter table public.needs_you add column inquiry_id uuid unique references public.project_inquiries(id) on delete restrict;

-- Privileged only to insert both rows in one transaction. Identity/target are
-- derived from active membership and the room, never supplied by the client.
create function public.submit_project_inquiry(
  p_room_id uuid, p_client_request_id uuid, p_subject text, p_detail text
) returns public.project_inquiries
language plpgsql security definer set search_path = '' as $$
declare
  v_inquiry public.project_inquiries;
  v_target uuid;
begin
  if auth.uid() is null or not public.is_room_member(p_room_id) then
    raise exception 'room_access_denied' using errcode = '42501';
  end if;
  if p_client_request_id is null or p_subject is null or p_detail is null
    or length(btrim(p_subject)) not between 1 and 160
    or length(btrim(p_detail)) not between 1 and 8000 then
    raise exception 'invalid_inquiry' using errcode = '22023';
  end if;
  select r.owner_organization_id into v_target from public.rooms r where r.id = p_room_id;
  insert into public.project_inquiries(room_id, submitted_by_user_id, client_request_id, subject, detail)
  values (p_room_id, auth.uid(), p_client_request_id, btrim(p_subject), btrim(p_detail))
  on conflict (submitted_by_user_id, client_request_id) do nothing
  returning * into v_inquiry;
  if not found then
    select * into v_inquiry from public.project_inquiries
    where submitted_by_user_id = auth.uid() and client_request_id = p_client_request_id;
    if v_inquiry.room_id <> p_room_id or v_inquiry.subject <> btrim(p_subject) or v_inquiry.detail <> btrim(p_detail) then
      raise exception 'inquiry_request_id_reused' using errcode = '22023';
    end if;
  end if;
  insert into public.needs_you(room_id, inquiry_id, title, detail, target_organization_id)
  values (p_room_id, v_inquiry.id, 'Inquiry: ' || v_inquiry.subject, v_inquiry.detail, v_target)
  on conflict (inquiry_id) do nothing;
  return v_inquiry;
end;
$$;
revoke all on function public.submit_project_inquiry(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.submit_project_inquiry(uuid, uuid, text, text) to authenticated;
