-- Wedding Day tab not showing the ceremony time: weddings.ceremony_time
-- (set in Settings) was never propagating to the one timeline_events row
-- with managed_type = 'ceremony'. Confirmed by comparing every wedding's
-- ceremony_time against its ceremony row's start_time — every single one
-- shows start_time = null, including a wedding whose ceremony_time is
-- actually set to 15:00:00. The sync_ceremony_time trigger the README
-- describes either never existed in this database or was lost at some
-- point — this recreates it from scratch (CREATE OR REPLACE is safe
-- either way) and backfills the rows that are currently stale.
--
-- Two triggers, matching the README's description of this invariant:
--  1. sync_ceremony_time — on insert/update of weddings.ceremony_time,
--     pushes the new value onto that wedding's ceremony timeline_events
--     row.
--  2. protect_ceremony_start_time — silently keeps a ceremony row's
--     existing start_time if anything tries to change it directly (the
--     Wedding Day edit form already disables that field for the ceremony
--     row and assumes exactly this: "the DB trigger would silently
--     ignore any change here anyway" — src/components/wedding-day/
--     TimelineEventModal.tsx). weddings.ceremony_time stays the only
--     place it can actually be changed, so the two values can never
--     drift apart again.

create or replace function public.sync_ceremony_time()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update timeline_events
  set start_time = new.ceremony_time
  where wedding_id = new.id
    and managed_type = 'ceremony';
  return new;
end;
$function$;

drop trigger if exists sync_ceremony_time on weddings;
create trigger sync_ceremony_time
after insert or update of ceremony_time on weddings
for each row
execute function public.sync_ceremony_time();

-- Backfill now, before the guard trigger below exists — otherwise this
-- very update would be the "direct edit" that trigger silently reverts.
update timeline_events te
set start_time = w.ceremony_time
from weddings w
where te.wedding_id = w.id
  and te.managed_type = 'ceremony'
  and te.start_time is distinct from w.ceremony_time;

create or replace function public.protect_ceremony_start_time()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if old.managed_type = 'ceremony' and new.start_time is distinct from old.start_time then
    new.start_time := old.start_time;
  end if;
  return new;
end;
$function$;

drop trigger if exists protect_ceremony_start_time on timeline_events;
create trigger protect_ceremony_start_time
before update on timeline_events
for each row
when (old.managed_type = 'ceremony')
execute function public.protect_ceremony_start_time();
