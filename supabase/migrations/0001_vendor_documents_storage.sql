-- Vendor document uploads: real files in Supabase Storage, not just links.
--
-- NOTE ON NUMBERING: this repo's checkout does not contain the base schema
-- migration the README describes (`supabase/migrations/0001_init.sql`,
-- with the weddings/vendors/vendor_documents/wedding_members tables, RLS
-- policies, and the create_wedding_for_current_user() function). That
-- schema clearly already exists in the live Supabase project (the app is
-- built against it, and `vendor_documents.storage_path` is already part of
-- it per src/lib/types/database.ts), but it was never committed here, so
-- this migration starts a fresh 0001 rather than continuing a sequence
-- that doesn't exist in version control. Apply the existing schema first
-- (however it currently lives — dashboard-managed or an uncommitted local
-- file) before running this one; it assumes `wedding_members`, `vendors`
-- and `vendor_documents` already exist exactly as database.ts describes.
--
-- Bucket is private (not public) — vendor documents can be contracts and
-- invoices, so access goes through the same wedding_id-scoped RLS model as
-- every other table, and the app requests short-lived signed URLs to view
-- or download a file rather than exposing a permanent public link.
--
-- Path convention (matches the comment already in database.ts):
--   weddings/{wedding_id}/vendors/{vendor_id}/documents/{filename}
-- storage.foldername(name) splits the object path into its folder
-- segments, so for that convention:
--   [1] = 'weddings'   [2] = wedding_id   [3] = 'vendors'
--   [4] = vendor_id    [5] = 'documents'

insert into storage.buckets (id, name, public)
values ('vendor-documents', 'vendor-documents', false)
on conflict (id) do nothing;

-- Read: owner/editor/viewer can see vendors at all (matches
-- canSeeVendorsAndTasks() in src/lib/utils/permissions.ts — timeline_viewer
-- never gets a vendors screen to view documents from in the first place).
create policy "vendor-documents: readable by wedding members with vendor access"
on storage.objects for select
to authenticated
using (
  bucket_id = 'vendor-documents'
  and exists (
    select 1
    from public.wedding_members wm
    where wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor', 'viewer')
      and wm.wedding_id::text = (storage.foldername(name))[2]
  )
  and exists (
    select 1
    from public.vendors v
    where v.id::text = (storage.foldername(name))[4]
      and v.wedding_id::text = (storage.foldername(name))[2]
  )
);

-- Write: only owner/editor (matches canEdit() — the same role gate the
-- DocumentManager UI already uses for every other vendor mutation).
create policy "vendor-documents: writable by wedding editors"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'vendor-documents'
  and exists (
    select 1
    from public.wedding_members wm
    where wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor')
      and wm.wedding_id::text = (storage.foldername(name))[2]
  )
  and exists (
    select 1
    from public.vendors v
    where v.id::text = (storage.foldername(name))[4]
      and v.wedding_id::text = (storage.foldername(name))[2]
  )
);

create policy "vendor-documents: updatable by wedding editors"
on storage.objects for update
to authenticated
using (
  bucket_id = 'vendor-documents'
  and exists (
    select 1
    from public.wedding_members wm
    where wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor')
      and wm.wedding_id::text = (storage.foldername(name))[2]
  )
)
with check (
  bucket_id = 'vendor-documents'
  and exists (
    select 1
    from public.wedding_members wm
    where wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor')
      and wm.wedding_id::text = (storage.foldername(name))[2]
  )
);

create policy "vendor-documents: deletable by wedding editors"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'vendor-documents'
  and exists (
    select 1
    from public.wedding_members wm
    where wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor')
      and wm.wedding_id::text = (storage.foldername(name))[2]
  )
);
