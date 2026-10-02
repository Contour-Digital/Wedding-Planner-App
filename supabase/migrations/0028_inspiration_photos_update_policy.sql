-- inspiration_photos never had an UPDATE policy, so with RLS on every update
-- matched zero rows and failed silently. NoteModal relies on one: changing
-- the board category of a note's photo that's already on the Inspiration
-- board updates the linked row in place, and that change was being dropped
-- (reopening the note showed the old category). Same editor-only rule as
-- insert/delete.
drop policy if exists "inspiration_photos: update by editors" on inspiration_photos;
create policy "inspiration_photos: update by editors"
on inspiration_photos for update
to authenticated
using (
  exists (
    select 1 from wedding_members wm
    where wm.wedding_id = inspiration_photos.wedding_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor')
  )
)
with check (
  exists (
    select 1 from wedding_members wm
    where wm.wedding_id = inspiration_photos.wedding_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor')
  )
);
