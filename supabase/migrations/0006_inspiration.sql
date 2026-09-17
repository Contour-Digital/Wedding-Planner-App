-- Inspiration tab: wedding-scoped photo mood board, sorted into categories
-- (Ceremony / Cocktail Hour / Reception / Wedding Party by default, plus
-- whatever custom ones a couple adds), displayed as a masonry gallery.
--
-- Same shape as every other feature in this app: two tables scoped by
-- wedding_id with their own RLS, following the exact role split already
-- used everywhere else (owner/editor/viewer can see, owner/editor can
-- write — canSeeVendorsAndTasks() / canEdit() in
-- src/lib/utils/permissions.ts). A category is safe to delete: photos in
-- it fall back to category_id = null ("Uncategorized" in the UI) via
-- ON DELETE SET NULL, never deleted or orphaned.
--
-- Every CREATE POLICY below is preceded by DROP POLICY IF EXISTS —
-- Postgres has no CREATE POLICY IF NOT EXISTS, so without that guard this
-- file isn't safe to re-run once it's gotten partway through (which is
-- exactly what happened here: a partial run left this needing a retry).

create table if not exists inspiration_categories (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (wedding_id, name)
);

create table if not exists inspiration_photos (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  category_id uuid references inspiration_categories (id) on delete set null,
  storage_path text not null,
  caption text,
  uploaded_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inspiration_categories_wedding_id_idx on inspiration_categories (wedding_id);
create index if not exists inspiration_photos_wedding_id_idx on inspiration_photos (wedding_id);
create index if not exists inspiration_photos_category_id_idx on inspiration_photos (category_id);

alter table inspiration_categories enable row level security;
alter table inspiration_photos enable row level security;

drop policy if exists "inspiration_categories: select by wedding members" on inspiration_categories;
create policy "inspiration_categories: select by wedding members"
on inspiration_categories for select
to authenticated
using (
  exists (
    select 1 from wedding_members wm
    where wm.wedding_id = inspiration_categories.wedding_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor', 'viewer')
  )
);

drop policy if exists "inspiration_categories: insert by editors" on inspiration_categories;
create policy "inspiration_categories: insert by editors"
on inspiration_categories for insert
to authenticated
with check (
  exists (
    select 1 from wedding_members wm
    where wm.wedding_id = inspiration_categories.wedding_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor')
  )
);

drop policy if exists "inspiration_categories: update by editors" on inspiration_categories;
create policy "inspiration_categories: update by editors"
on inspiration_categories for update
to authenticated
using (
  exists (
    select 1 from wedding_members wm
    where wm.wedding_id = inspiration_categories.wedding_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor')
  )
);

drop policy if exists "inspiration_categories: delete by editors" on inspiration_categories;
create policy "inspiration_categories: delete by editors"
on inspiration_categories for delete
to authenticated
using (
  exists (
    select 1 from wedding_members wm
    where wm.wedding_id = inspiration_categories.wedding_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor')
  )
);

drop policy if exists "inspiration_photos: select by wedding members" on inspiration_photos;
create policy "inspiration_photos: select by wedding members"
on inspiration_photos for select
to authenticated
using (
  exists (
    select 1 from wedding_members wm
    where wm.wedding_id = inspiration_photos.wedding_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor', 'viewer')
  )
);

drop policy if exists "inspiration_photos: insert by editors" on inspiration_photos;
create policy "inspiration_photos: insert by editors"
on inspiration_photos for insert
to authenticated
with check (
  exists (
    select 1 from wedding_members wm
    where wm.wedding_id = inspiration_photos.wedding_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor')
  )
);

drop policy if exists "inspiration_photos: delete by editors" on inspiration_photos;
create policy "inspiration_photos: delete by editors"
on inspiration_photos for delete
to authenticated
using (
  exists (
    select 1 from wedding_members wm
    where wm.wedding_id = inspiration_photos.wedding_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor')
  )
);

-- Storage: a PUBLIC bucket, deliberately unlike vendor-documents (private +
-- signed URLs). A masonry gallery renders many thumbnails at once, and
-- generating/expiring a signed URL per photo adds real complexity for
-- content that isn't sensitive — a mood-board photo, not a contract.
-- Row-level access to *which photos exist* is still fully governed by the
-- RLS above; "public" only means someone with the exact object URL can
-- load that one image without signing in.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inspiration-photos',
  'inspiration-photos',
  true,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path convention: weddings/{wedding_id}/inspiration/{filename} — no
-- category segment, unlike vendor-documents' vendor_id folder, because a
-- photo's category is a mutable attribute on its DB row (reassigning it
-- shouldn't mean moving the underlying file). storage.foldername(name)
-- splits into ['weddings', wedding_id, 'inspiration'], so [2] = wedding_id.
drop policy if exists "inspiration-photos: writable by wedding editors" on storage.objects;
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

drop policy if exists "inspiration-photos: deletable by wedding editors" on storage.objects;
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
