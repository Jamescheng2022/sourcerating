-- P1 verified room files. Server-side verification becomes the trust anchor.

alter table public.room_file_versions
  add column if not exists verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','quarantined','hash_mismatch','verification_failed')),
  add column if not exists client_sha256 text,
  add column if not exists server_sha256 text,
  add column if not exists detected_mime_type text,
  add column if not exists verified_at timestamptz,
  add column if not exists verification_error text;

update public.room_file_versions
set client_sha256 = coalesce(client_sha256, sha256)
where client_sha256 is null;

create index if not exists room_file_versions_verification_idx
  on public.room_file_versions(verification_status, created_at)
  where verification_status <> 'verified';

-- Keep legacy sha256 for backward compatibility in P1 but treat server_sha256
-- as the evidence-grade hash once verification_status='verified'.

create or replace function public.get_room_file_version_for_access(p_file_version_id uuid)
returns public.room_file_versions
language sql
stable
security definer
set search_path = public
as $$
  select f.*
  from public.room_file_versions f
  where f.id = p_file_version_id
    and public.is_room_member(f.room_id)
  limit 1;
$$;

revoke all on function public.get_room_file_version_for_access(uuid) from public, anon;
grant execute on function public.get_room_file_version_for_access(uuid) to authenticated;