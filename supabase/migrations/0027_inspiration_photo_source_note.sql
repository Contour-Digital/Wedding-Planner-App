-- Tracks which note (if any) a photo on the Inspiration board was copied
-- from via "Also add this photo to the Inspiration board" (NoteModal). Lets
-- Inspiration open that note instead of the plain photo viewer when such a
-- photo is clicked. ON DELETE SET NULL: deleting the note just detaches the
-- reference — the photo itself, copied independently, is unaffected.
alter table public.inspiration_photos
  add column if not exists source_note_id uuid references public.notes (id) on delete set null;

create index if not exists inspiration_photos_source_note_id_idx on public.inspiration_photos (source_note_id);
