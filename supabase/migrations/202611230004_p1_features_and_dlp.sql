-- 202611230004_p1_features_and_dlp.sql
-- Phase 1 - Week 1: Organization Feature Flags & DLP Audit Storage
set local lock_timeout = '3s';

-- 1. Feature flag control table per organization
create table if not exists public.sr_org_features (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  feature         text not null check (feature in (
    'undo_send', 'message_redact', 'read_receipts', 'quick_replies',
    'labels', 'translate_before_send', 'rfq_extraction', 'sealed_bids', 'legal_hold'
  )),
  enabled         boolean not null default true,
  enabled_at      timestamptz not null default clock_timestamp(),
  enabled_by      uuid references auth.users(id) on delete set null,
  primary key (organization_id, feature)
);

alter table public.sr_org_features enable row level security;
alter table public.sr_org_features force row level security;

drop policy if exists sr_org_features_select on public.sr_org_features;
create policy sr_org_features_select on public.sr_org_features
  for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists sr_org_features_admin on public.sr_org_features;
create policy sr_org_features_admin on public.sr_org_features
  for all to authenticated
  using (
    public.is_org_member(organization_id)
    and coalesce(public.sr_org_role(organization_id), '') in ('owner', 'admin')
  )
  with check (
    public.is_org_member(organization_id)
    and coalesce(public.sr_org_role(organization_id), '') in ('owner', 'admin')
  );

revoke all on public.sr_org_features from public, anon;
grant select on public.sr_org_features to authenticated;
grant all on public.sr_org_features to postgres, service_role;

-- 2. Fast check helper for features
create or replace function public.sr_is_feature_enabled(p_organization_id uuid, p_feature text)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select coalesce(
    (select enabled from public.sr_org_features
      where organization_id = p_organization_id and feature = p_feature),
    true -- Default enabled unless explicitly disabled
  );
$$;

revoke all on function public.sr_is_feature_enabled(uuid, text) from public, anon;
grant execute on function public.sr_is_feature_enabled(uuid, text) to authenticated;
