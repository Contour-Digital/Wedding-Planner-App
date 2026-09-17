-- Replace pinpoint (x/y positioned) photo comments with plain notes — a
-- photo just has a list of notes shown when you open it, no positioning.
-- Same table (inspiration_photo_comments), same RLS from migration 0007
-- (unaffected — none of those policies reference x/y), just drops the two
-- columns that only existed to place a pin.
alter table inspiration_photo_comments drop column if exists x;
alter table inspiration_photo_comments drop column if exists y;
