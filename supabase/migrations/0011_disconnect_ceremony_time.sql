-- Disconnect ceremony time in Wedding Day from ceremony_time in Settings
-- (explicit request, reversing 0009). The Ceremony row's start_time on the
-- Wedding Day run sheet is now a normal, independently-editable field like
-- any other timeline item's time — weddings.ceremony_time in Settings
-- stays as its own separate value that nothing else reads.
drop trigger if exists sync_ceremony_time on weddings;
drop function if exists public.sync_ceremony_time();

drop trigger if exists protect_ceremony_start_time on timeline_events;
drop function if exists public.protect_ceremony_start_time();
