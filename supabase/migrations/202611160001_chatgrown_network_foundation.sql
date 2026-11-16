-- SourceRating: opt-in profile + organization-scoped relationship memory.
-- Contract: Master PDR v3.1 (Chat First, independent organizations, private-by-default).
-- Not applied to the Lab database by this commit. Run in an isolated DB first.
-- No backfill or extraction from existing private room events is performed.
begin;

create table public.sr_organization_profiles (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 160),
  description text check (description is null or char_length(description) <= 5000),
  website_url text check (website_url is null or char_length(website_url) <= 500),
  country text check (country is null or char_length(country) <= 100),
  capabilities text[] not null default '{}',
  visibility text not null default 'private' check (visibility in ('private','public')),
  published_by uuid references auth.users(id),
  published_at timestamptz,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  constraint sr_org_public_requires_approval check (
    visibility = 'private' or (published_by is not null and published_at is not null)
  ),
  constraint sr_org_capabilities_limited check (cardinality(capabilities) <= 30)
);

create table public.sr_person_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 120),
  headline text check (headline is null or char_length(headline) <= 180),
  bio text check (bio is null or char_length(bio) <= 3000),
  skills text[] not null default '{}',
  visibility text not null default 'private' check (visibility in ('private','public')),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint sr_person_public_requires_approval check (
    visibility = 'private' or published_at is not null
  ),
  constraint sr_person_skills_limited check (cardinality(skills) <= 30)
);

-- A counterparty is NOT automatically created as a public profile.
-- owner_organization_id makes the relationship directional and strictly private.
create table public.sr_organization_relationships (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references public.organizations(id) on delete cascade,
  counterparty_organization_id uuid references public.organizations(id) on delete set null,
  counterparty_name text not null check (char_length(btrim(counterparty_name)) between 2 and 160),
  relationship_kind text not null check (relationship_kind in ('buyer','supplier','partner','other')),
  stage text not null default 'prospect' check (stage in ('prospect','contacted','active','paused')),
  private_notes text check (private_notes is null or char_length(private_notes) <= 4000),
  source_project_id uuid references public.projects(id) on delete set null,
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint sr_relationship_not_self check (
    counterparty_organization_id is null or counterparty_organization_id <> owner_organization_id
  )
);
create index sr_relationship_owner_stage_idx
 on public.sr_organization_relationships(owner_organization_id,stage,updated_at desc);
create unique index sr_relationship_known_org_uniq
 on public.sr_organization_relationships(owner_organization_id,counterparty_organization_id,relationship_kind)
 where counterparty_organization_id is not null;

-- Derived intelligence: suggestions are untrusted draft data, never canonical.
-- No room text / private attachments are copied here by default.
create table public.sr_profile_suggestions (
  id uuid primary key default gen_random_uuid(),
  target_organization_id uuid references public.organizations(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete cascade,
  field_key text not null check (field_key in (
    'description','website_url','country','capabilities','headline','bio','skills'
  )),
  proposed_value jsonb not null,
  source_kind text not null check (source_kind in ('manual','brochure_text','website_text','authorized_room')),
  source_label text check (source_label is null or char_length(source_label) <= 280),
  confidence numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  status text not null default 'pending' check (status in ('pending','accepted','dismissed')),
  created_by uuid not null default auth.uid() references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sr_suggestion_single_owner check ((target_organization_id is null) <> (target_user_id is null)),
  constraint sr_suggestion_payload_size check (pg_column_size(proposed_value) <= 6000),
  constraint sr_suggestion_field_scope check (
    (target_organization_id is not null and field_key in ('description','website_url','country','capabilities'))
    or (target_user_id is not null and field_key in ('headline','bio','skills'))
  ),
  constraint sr_suggestion_review_consistency check (
    status = 'pending' or (reviewed_by is not null and reviewed_at is not null)
  )
);
create index sr_suggestion_org_pending_idx
 on public.sr_profile_suggestions(target_organization_id,created_at desc) where status='pending';
create index sr_suggestion_user_pending_idx
 on public.sr_profile_suggestions(target_user_id,created_at desc) where status='pending';

alter table public.sr_organization_profiles enable row level security;
alter table public.sr_person_profiles enable row level security;
alter table public.sr_organization_relationships enable row level security;
alter table public.sr_profile_suggestions enable row level security;

revoke all on public.sr_organization_profiles from public, anon, authenticated;
revoke all on public.sr_person_profiles from public, anon, authenticated;
revoke all on public.sr_organization_relationships from public, anon, authenticated;
revoke all on public.sr_profile_suggestions from public, anon, authenticated;

grant select on public.sr_organization_profiles, public.sr_person_profiles to anon, authenticated;
grant insert, update on public.sr_organization_profiles, public.sr_person_profiles to authenticated;
grant select, insert, update, delete on public.sr_organization_relationships to authenticated;
grant select, insert, update on public.sr_profile_suggestions to authenticated;

-- RLS membership remains project-independent; merely being in a shared Room does not
-- permit a user to modify the other company's profile or read its private CRM.
create policy sr_org_profile_member_read on public.sr_organization_profiles
 for select to authenticated using (public.is_org_member(organization_id));
create policy sr_org_profile_public_read on public.sr_organization_profiles
 for select to anon, authenticated using (visibility='public' and published_at is not null);

create policy sr_org_profile_admin_insert on public.sr_organization_profiles
 for insert to authenticated with check (
  exists (select 1 from public.organization_memberships m
    where m.organization_id=organization_id and m.user_id=(select auth.uid())
      and m.removed_at is null and m.role in ('owner','admin'))
  and updated_by=(select auth.uid())
  and (visibility='private' or (published_by=(select auth.uid()) and published_at is not null))
 );
create policy sr_org_profile_admin_update on public.sr_organization_profiles
 for update to authenticated using (
  exists (select 1 from public.organization_memberships m
    where m.organization_id=organization_id and m.user_id=(select auth.uid())
      and m.removed_at is null and m.role in ('owner','admin'))
 ) with check (
  exists (select 1 from public.organization_memberships m
    where m.organization_id=organization_id and m.user_id=(select auth.uid())
      and m.removed_at is null and m.role in ('owner','admin'))
  and updated_by=(select auth.uid())
  and (visibility='private' or (published_by=(select auth.uid()) and published_at is not null))
 );

create policy sr_person_profile_self_read on public.sr_person_profiles
 for select to authenticated using (user_id=(select auth.uid()));
create policy sr_person_profile_public_read on public.sr_person_profiles
 for select to anon, authenticated using (visibility='public' and published_at is not null);
create policy sr_person_profile_self_insert on public.sr_person_profiles
 for insert to authenticated with check (user_id=(select auth.uid()));
create policy sr_person_profile_self_update on public.sr_person_profiles
 for update to authenticated using (user_id=(select auth.uid()))
 with check (user_id=(select auth.uid()));

-- Only organization owners/admins can access company-private relationship notes.
create policy sr_relationship_admin_read on public.sr_organization_relationships
 for select to authenticated using (
  exists (select 1 from public.organization_memberships m
    where m.organization_id=owner_organization_id and m.user_id=(select auth.uid())
      and m.removed_at is null and m.role in ('owner','admin'))
 );
create policy sr_relationship_admin_insert on public.sr_organization_relationships
 for insert to authenticated with check (
  created_by=(select auth.uid()) and exists (
   select 1 from public.organization_memberships m
    where m.organization_id=owner_organization_id and m.user_id=(select auth.uid())
      and m.removed_at is null and m.role in ('owner','admin'))
 );
create policy sr_relationship_admin_update on public.sr_organization_relationships
 for update to authenticated using (
  exists (select 1 from public.organization_memberships m
    where m.organization_id=owner_organization_id and m.user_id=(select auth.uid())
      and m.removed_at is null and m.role in ('owner','admin'))
 ) with check (
  exists (select 1 from public.organization_memberships m
    where m.organization_id=owner_organization_id and m.user_id=(select auth.uid())
      and m.removed_at is null and m.role in ('owner','admin'))
 );
create policy sr_relationship_admin_delete on public.sr_organization_relationships
 for delete to authenticated using (
  exists (select 1 from public.organization_memberships m
    where m.organization_id=owner_organization_id and m.user_id=(select auth.uid())
      and m.removed_at is null and m.role in ('owner','admin'))
 );

create policy sr_suggestion_owner_read on public.sr_profile_suggestions
 for select to authenticated using (
  target_user_id=(select auth.uid()) or
  exists (select 1 from public.organization_memberships m
    where m.organization_id=target_organization_id and m.user_id=(select auth.uid())
      and m.removed_at is null and m.role in ('owner','admin'))
 );
create policy sr_suggestion_owner_insert on public.sr_profile_suggestions
 for insert to authenticated with check (
  status='pending' and reviewed_at is null and reviewed_by is null
  and created_by=(select auth.uid())
  and (target_user_id=(select auth.uid()) or
   exists (select 1 from public.organization_memberships m
    where m.organization_id=target_organization_id and m.user_id=(select auth.uid())
      and m.removed_at is null and m.role in ('owner','admin')))
 );
create policy sr_suggestion_owner_update on public.sr_profile_suggestions
 for update to authenticated using (
  status='pending' and
  (target_user_id=(select auth.uid()) or
   exists (select 1 from public.organization_memberships m
    where m.organization_id=target_organization_id and m.user_id=(select auth.uid())
      and m.removed_at is null and m.role in ('owner','admin')))
 ) with check (
  created_by is not null
  and (target_user_id=(select auth.uid()) or
   exists (select 1 from public.organization_memberships m
    where m.organization_id=target_organization_id and m.user_id=(select auth.uid())
      and m.removed_at is null and m.role in ('owner','admin')))
  and (status='pending' or (reviewed_by=(select auth.uid()) and reviewed_at is not null))
 );

comment on table public.sr_organization_profiles is 'Optional directory profile. PRIVATE until a company admin explicitly publishes.';
comment on table public.sr_organization_relationships is 'Private owner-company buyer/supplier relationship memory, NOT a public contact list.';
comment on table public.sr_profile_suggestions is 'AI/manual candidate facts only; confirmation and publication are separate actions.';
-- Stop a user who manages two firms from silently reassigning private records
-- to a different legal entity. Cross-org merges require a future audited workflow.
create function public.sr_network_immutable_identity() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if TG_TABLE_NAME = 'sr_organization_profiles' then
    if new.organization_id is distinct from old.organization_id then
      raise exception 'organization_identity_immutable' using errcode = '22023';
    end if;
  elsif TG_TABLE_NAME = 'sr_organization_relationships' then
    if new.owner_organization_id is distinct from old.owner_organization_id
       or new.created_by is distinct from old.created_by then
      raise exception 'private_relationship_owner_immutable' using errcode = '22023';
    end if;
  elsif TG_TABLE_NAME = 'sr_profile_suggestions' then
    if old.status <> 'pending' or
       new.target_organization_id is distinct from old.target_organization_id or
       new.target_user_id is distinct from old.target_user_id or
       new.field_key is distinct from old.field_key or
       new.proposed_value is distinct from old.proposed_value or
       new.source_kind is distinct from old.source_kind or
       new.source_label is distinct from old.source_label or
       new.created_by is distinct from old.created_by then
      raise exception 'suggestion_provenance_immutable' using errcode = '22023';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.sr_network_immutable_identity() from public, anon, authenticated;

create trigger sr_org_profile_identity_guard
 before update on public.sr_organization_profiles
 for each row execute function public.sr_network_immutable_identity();
create trigger sr_relationship_identity_guard
 before update on public.sr_organization_relationships
 for each row execute function public.sr_network_immutable_identity();
create trigger sr_suggestion_provenance_guard
 before update on public.sr_profile_suggestions
 for each row execute function public.sr_network_immutable_identity();

-- Transactional confirmation / dismissal of profile suggestions.
-- Prevents race conditions and guarantees that suggestion review status
-- and profile field updates are committed together in one atomic transaction.
create or replace function public.sr_decide_profile_suggestion(
  p_suggestion_id uuid,
  p_target_organization_id uuid,
  p_decision text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_sug record;
  v_field text;
  v_val jsonb;
  v_res jsonb;
begin
  if v_caller is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if p_decision not in ('accept', 'dismiss') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;

  -- Verify caller is active owner or admin of the target organization
  if p_target_organization_id is not null then
    if not exists (
      select 1 from public.organization_memberships
      where organization_id = p_target_organization_id
        and user_id = v_caller
        and removed_at is null
        and role in ('owner', 'admin')
    ) then
      raise exception 'organization_access_denied' using errcode = '42501';
    end if;

    -- Lock and retrieve the suggestion
    select * into v_sug from public.sr_profile_suggestions
    where id = p_suggestion_id
      and target_organization_id = p_target_organization_id
      and status = 'pending'
    for update;
  else
    -- Person suggestion: target user must be caller
    select * into v_sug from public.sr_profile_suggestions
    where id = p_suggestion_id
      and target_user_id = v_caller
      and status = 'pending'
    for update;
  end if;

  if not found then
    raise exception 'suggestion_not_found_or_not_pending' using errcode = 'P0002';
  end if;

  v_field := v_sug.field_key;
  v_val := v_sug.proposed_value;

  if p_decision = 'accept' then
    if v_sug.target_organization_id is not null then
      -- Ensure organization profile exists
      insert into public.sr_organization_profiles (
        organization_id, display_name, updated_by, updated_at
      )
      select p_target_organization_id, o.name, v_caller, now()
      from public.organizations o
      where o.id = p_target_organization_id
      on conflict (organization_id) do nothing;

      -- Apply field value atomically
      if v_field = 'description' then
        update public.sr_organization_profiles
        set description = trim(both '"' from v_val::text),
            updated_by = v_caller,
            updated_at = now()
        where organization_id = p_target_organization_id;
      elsif v_field = 'website_url' then
        update public.sr_organization_profiles
        set website_url = trim(both '"' from v_val::text),
            updated_by = v_caller,
            updated_at = now()
        where organization_id = p_target_organization_id;
      elsif v_field = 'country' then
        update public.sr_organization_profiles
        set country = trim(both '"' from v_val::text),
            updated_by = v_caller,
            updated_at = now()
        where organization_id = p_target_organization_id;
      elsif v_field = 'capabilities' then
        update public.sr_organization_profiles
        set capabilities = array(select jsonb_array_elements_text(v_val)),
            updated_by = v_caller,
            updated_at = now()
        where organization_id = p_target_organization_id;
      end if;
    else
      -- Person profile
      insert into public.sr_person_profiles (
        user_id, display_name, updated_at
      )
      values (v_caller, 'Member', now())
      on conflict (user_id) do nothing;

      if v_field = 'headline' then
        update public.sr_person_profiles
        set headline = trim(both '"' from v_val::text),
            updated_at = now()
        where user_id = v_caller;
      elsif v_field = 'bio' then
        update public.sr_person_profiles
        set bio = trim(both '"' from v_val::text),
            updated_at = now()
        where user_id = v_caller;
      elsif v_field = 'skills' then
        update public.sr_person_profiles
        set skills = array(select jsonb_array_elements_text(v_val)),
            updated_at = now()
        where user_id = v_caller;
      end if;
    end if;

    -- Mark suggestion accepted
    update public.sr_profile_suggestions
    set status = 'accepted',
        reviewed_by = v_caller,
        reviewed_at = now()
    where id = p_suggestion_id;

    v_res := jsonb_build_object('ok', true, 'status', 'accepted', 'field_key', v_field);
  else
    -- Dismiss suggestion
    update public.sr_profile_suggestions
    set status = 'dismissed',
        reviewed_by = v_caller,
        reviewed_at = now()
    where id = p_suggestion_id;

    v_res := jsonb_build_object('ok', true, 'status', 'dismissed', 'field_key', v_field);
  end if;

  return v_res;
end $$;

revoke all on function public.sr_decide_profile_suggestion(uuid, uuid, text) from public, anon;
grant execute on function public.sr_decide_profile_suggestion(uuid, uuid, text) to authenticated;

commit;
