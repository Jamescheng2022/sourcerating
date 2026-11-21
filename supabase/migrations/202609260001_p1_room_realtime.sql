-- P1 realtime delivery for canonical room events.
-- Postgres remains source of truth; clients always gap-fill by room seq.

alter publication supabase_realtime add table public.room_events;