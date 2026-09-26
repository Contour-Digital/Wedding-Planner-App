-- Notes tab: wedding-scoped idea notes, sorted into categories the couple
-- defines themselves (no defaults seeded — unlike Inspiration's Ceremony /
-- Cocktail Hour / etc., there's no obviously "right" starting set for
-- free-form idea notes).
--
-- Same shape as every other feature in this app: two tables scoped by
-- wedding_id with their own RLS, following the exact role split already
-- used everywhere else (owner/editor/viewer can see, owner/editor can
-- write — canSeeVendorsAndTasks() / canEdit() in
-- src/lib/utils/permissions.ts). A category is safe to delete: notes in it
-- fall back to category_id = null ("Uncategorized" in the UI) via
-- ON DELETE SET NULL, never deleted or orphaned.
--
-- Every CREATE POLICY below is preceded by DROP POLICY IF EXISTS —
-- Postgres has no CREATE POLICY IF NOT EXISTS, so without that guard this
-- file isn't safe to re-run once it's gotten partway through.

create table if not exists note_categories (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (wedding_id, name)
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  category_id uuid references note_categories (id) on delete set null,
  title text,
  content text not null,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists note_categories_wedding_id_idx on note_categories (wedding_id);
create index if not exists notes_wedding_id_idx on notes (wedding_id);
create index if not exists notes_category_id_idx on notes (category_id);

alter table note_categories enable row level security;
alter table notes enable row level security;

drop policy if exists "note_categories: select by wedding members" on note_categories;
create policy "note_categories: select by wedding members"
on note_categories for select
to authenticated
using (
  exists (
    select 1 from wedding_members wm
    where wm.wedding_id = note_categories.wedding_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor', 'viewer')
  )
);

drop policy if exists "note_categories: insert by editors" on note_categories;
create policy "note_categories: insert by editors"
on note_categories for insert
to authenticated
with check (
  exists (
    select 1 from wedding_members wm
    where wm.wedding_id = note_categories.wedding_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor')
  )
);

drop policy if exists "note_categories: update by editors" on note_categories;
create policy "note_categories: update by editors"
on note_categories for update
to authenticated
using (
  exists (
    select 1 from wedding_members wm
    where wm.wedding_id = note_categories.wedding_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor')
  )
);

drop policy if exists "note_categories: delete by editors" on note_categories;
create policy "note_categories: delete by editors"
on note_categories for delete
to authenticated
using (
  exists (
    select 1 from wedding_members wm
    where wm.wedding_id = note_categories.wedding_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor')
  )
);

drop policy if exists "notes: select by wedding members" on notes;
create policy "notes: select by wedding members"
on notes for select
to authenticated
using (
  exists (
    select 1 from wedding_members wm
    where wm.wedding_id = notes.wedding_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor', 'viewer')
  )
);

drop policy if exists "notes: insert by editors" on notes;
create policy "notes: insert by editors"
on notes for insert
to authenticated
with check (
  exists (
    select 1 from wedding_members wm
    where wm.wedding_id = notes.wedding_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor')
  )
);

drop policy if exists "notes: update by editors" on notes;
create policy "notes: update by editors"
on notes for update
to authenticated
using (
  exists (
    select 1 from wedding_members wm
    where wm.wedding_id = notes.wedding_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor')
  )
);

drop policy if exists "notes: delete by editors" on notes;
create policy "notes: delete by editors"
on notes for delete
to authenticated
using (
  exists (
    select 1 from wedding_members wm
    where wm.wedding_id = notes.wedding_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor')
  )
);
