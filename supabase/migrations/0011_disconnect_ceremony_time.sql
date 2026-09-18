-- Disconnect ceremony time in Wedding Day from ceremony_time in Settings
-- (explicit request, reversing 0009). The Ceremony row's start_time on the
-- Wedding Day run sheet is now a normal, independently-editable field like
-- any other timeline item's time — weddings.ceremony_time in Settings
-- stays as its own separate value that nothing else reads.
--
-- The live database's original base-schema trigger (never committed to
-- this repo — see the note in 0001) was actually named
-- on_ceremony_time_change, not sync_ceremony_time; 0009 only created/
-- dropped a trigger called sync_ceremony_time (matching the function
-- name), so that original trigger was left behind still pointing at the
-- same function, and dropping the function here fails with "other
-- objects depend on it" until this is also dropped.
drop trigger if exists on_ceremony_time_change on weddings;
drop trigger if exists sync_ceremony_time on weddings;
drop function if exists public.sync_ceremony_time();

drop trigger if exists protect_ceremony_start_time on timeline_events;
drop function if exists public.protect_ceremony_start_time();
