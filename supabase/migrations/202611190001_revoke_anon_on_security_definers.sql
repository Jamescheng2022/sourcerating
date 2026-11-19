-- 202611190001_revoke_anon_on_security_definers.sql
-- Close P2 Advisor Findings & Enforce Strict Least Privilege for Release A:
-- 1. Revoke EXECUTE from PUBLIC and anon on sr_post_room_message
-- 2. Revoke EXECUTE from PUBLIC and anon on sr_record_confirmation
-- 3. Revoke EXECUTE from PUBLIC and anon on validate_source_rating_agent_secret
-- 4. Pin search_path on helper functions (sr_clean_message_text, sr_clean_name, sr_room_is_internal)

-- 1. Tighten sr_post_room_message permissions
revoke all on function public.sr_post_room_message(uuid, uuid, uuid, jsonb) from public, anon;
grant execute on function public.sr_post_room_message(uuid, uuid, uuid, jsonb) to authenticated;

-- 2. Tighten sr_record_confirmation permissions
revoke all on function public.sr_record_confirmation(uuid, uuid, uuid, text, uuid, text, text) from public, anon;
grant execute on function public.sr_record_confirmation(uuid, uuid, uuid, text, uuid, text, text) to authenticated;

-- 3. Tighten validate_source_rating_agent_secret (prevent anonymous oracle / brute-force)
revoke all on function public.validate_source_rating_agent_secret(text) from public, anon;
grant execute on function public.validate_source_rating_agent_secret(text) to authenticated;

-- 4. Set explicit search_path on immutable helper functions to clear advisor warnings
create or replace function public.sr_clean_message_text(p_text text, p_max integer default 10000)
returns text language sql immutable
set search_path = public, extensions
as $$
  select nullif(left(btrim(regexp_replace(coalesce(p_text, ''), '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g')), p_max), '');
$$;

create or replace function public.sr_clean_name(p_text text, p_max integer)
returns text language sql immutable
set search_path = public, extensions
as $$
  select nullif(left(btrim(regexp_replace(coalesce(p_text,''), '[[:cntrl:]]', ' ', 'g')), p_max), '');
$$;

create or replace function public.sr_room_is_internal(p_kind text)
returns boolean language sql immutable
set search_path = public, extensions
as $$
  select p_kind in ('internal','buyer_internal');
$$;
