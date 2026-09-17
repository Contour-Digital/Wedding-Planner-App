-- Fix "new row violates row-level security policy" when uploading an
-- inspiration photo.
--
-- Confirmed via pg_policies: "inspiration-photos: writable by wedding
-- editors" (the INSERT policy on storage.objects from migration 0006)
-- exists but its with_check is NULL — no condition is actually being
-- enforced, and for an INSERT-only policy that means no row can ever
-- satisfy it, so every upload gets rejected. Its delete counterpart
-- ("inspiration-photos: deletable by wedding editors") is missing
-- entirely — it never got created. Both are dropped (whatever state
-- they're currently in) and recreated correctly, matching the working
-- vendor-documents policies right next to them.

drop policy if exists "inspiration-photos: writable by wedding editors" on storage.objects;
drop policy if exists "inspiration-photos: deletable by wedding editors" on storage.objects;

create policy "inspiration-photos: writable by wedding editors"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'inspiration-photos'
  and exists (
    select 1
    from public.wedding_members wm
    where wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor')
      and wm.wedding_id::text = (storage.foldername(name))[2]
  )
);

create policy "inspiration-photos: deletable by wedding editors"
on storage.objects for delete
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
