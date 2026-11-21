-- SourceRating: Destructive Schema Rollback for 202611160001_chatgrown_network_foundation.sql
-- WARNING: This is a DESTRUCTIVE reset script that drops all 4 network tables with CASCADE.
-- Any data stored in these tables will be permanently deleted.
-- Before running in production or staging, perform a full database backup/dump!
begin;

-- 1. Drop triggers
drop trigger if exists sr_suggestion_provenance_guard on public.sr_profile_suggestions;
drop trigger if exists sr_relationship_identity_guard on public.sr_organization_relationships;
drop trigger if exists sr_org_profile_identity_guard on public.sr_organization_profiles;

-- 2. Drop functions
drop function if exists public.sr_decide_profile_suggestion(uuid, uuid, text) cascade;
drop function if exists public.sr_network_immutable_identity() cascade;

-- 3. Drop the 4 tables in reverse dependency order
drop table if exists public.sr_profile_suggestions cascade;
drop table if exists public.sr_organization_relationships cascade;
drop table if exists public.sr_person_profiles cascade;
drop table if exists public.sr_organization_profiles cascade;

commit;
