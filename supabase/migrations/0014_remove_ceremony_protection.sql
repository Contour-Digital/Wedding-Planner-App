-- Remove the "Protected" ceremony special-casing entirely. Ceremony time
-- syncing from Settings was already disconnected (migration 0011); this
-- goes the rest of the way. Before this, the Ceremony run-sheet item could
-- never be deleted — the old delete policy explicitly excluded
-- managed_type = 'ceremony' rows — which left a blank, un-editable-title,
-- un-removable "Ceremony — Protected" row with no start_time sitting on
-- the Wedding Day tab with no way to clean it up, once someone (unable to
-- fix that row) added a normal replacement "Ceremony" item instead.
--
-- Converts every existing ceremony row to a normal timeline_events row
-- (managed_type = null) and replaces the delete policy so managed_type no
-- longer matters — every run-sheet item is editable and deletable like
-- any other now.
update timeline_events set managed_type = null where managed_type = 'ceremony';

drop policy if exists "editors delete non-managed timeline rows" on timeline_events;
create policy "editors delete timeline rows"
on timeline_events for delete
to authenticated
using (is_wedding_editor(wedding_id));
