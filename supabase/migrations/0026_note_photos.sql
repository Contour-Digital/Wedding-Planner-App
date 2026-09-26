-- Lets a note carry one photo, stored in the same public bucket Inspiration
-- already uses (inspiration-photos — see 0006_inspiration.sql) under its own
-- weddings/{wedding_id}/notes/ prefix — its existing wedding-editor
-- insert/delete policies key off (storage.foldername(name))[2] = wedding_id
-- only, not the third path segment, so they already cover this prefix too.
alter table public.notes
  add column if not exists photo_path text;

-- "Also add to Inspiration board" copies the note's photo into a second,
-- independent object under .../inspiration/ via storage.copy(). That call
-- reads the source object row through the authenticated Storage API (unlike
-- a plain public-URL download, which never touches RLS at all), and 0006
-- never needed a SELECT policy on storage.objects for this bucket until now.
drop policy if exists "inspiration-photos: readable by wedding editors" on storage.objects;
create policy "inspiration-photos: readable by wedding editors"
on storage.objects for select
to authenticated
using (
  bucket_id = 'inspiration-photos'
  and exists (
    select 1
    from public.wedding_members wm
    where wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor')
      and wm.wedding_id::text = (storage.foldername(name))[2]
  )
);
