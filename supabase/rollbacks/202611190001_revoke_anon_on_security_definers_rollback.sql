-- 202611190001_revoke_anon_on_security_definers_rollback.sql
-- Rollback for 202611190001_revoke_anon_on_security_definers.sql

-- Restore original execute grants
grant execute on function public.sr_post_room_message(uuid, uuid, uuid, jsonb) to public;
grant execute on function public.sr_record_confirmation(uuid, uuid, uuid, text, uuid, text, text) to public;
grant execute on function public.validate_source_rating_agent_secret(text) to anon, authenticated;

-- Restore helper functions without pinned search_path
create or replace function public.sr_clean_message_text(p_text text, p_max integer default 10000)
returns text language sql immutable as $$
  select nullif(left(btrim(regexp_replace(coalesce(p_text, ''), '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g')), p_max), '');
$$;

create or replace function public.sr_clean_name(p_text text, p_max integer)
returns text language sql immutable as $$
  select nullif(left(btrim(regexp_replace(coalesce(p_text,''), '[[:cntrl:]]', ' ', 'g')), p_max), '');
$$;

create or replace function public.sr_room_is_internal(p_kind text)
returns boolean language sql immutable as $$
  select p_kind in ('internal','buyer_internal');
$$;
