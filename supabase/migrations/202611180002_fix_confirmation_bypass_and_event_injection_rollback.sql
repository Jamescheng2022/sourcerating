-- 202611180002_fix_confirmation_bypass_and_event_injection_rollback.sql
-- Rollback for 202611180002_fix_confirmation_bypass_and_event_injection.sql

grant execute on function public.append_room_event(uuid, uuid, uuid, text, jsonb) to authenticated;
drop function if exists public.sr_post_room_message(uuid, uuid, uuid, jsonb);
