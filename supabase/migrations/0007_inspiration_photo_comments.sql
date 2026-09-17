-- Pinpoint comments on inspiration photos: click a spot on a photo (in the
-- larger viewer) to drop a small marker with a note — "love this bouquet
-- style", "want drapes like this" — instead of one caption for the whole
-- image.
--
-- A straightforward child of inspiration_photos, joined through it rather
-- than carrying its own wedding_id — a denormalized wedding_id here would
-- be one more place it could ever drift from the photo's actual wedding;
-- joining through photo_id can't drift because there's nothing to keep in
-- sync.
create table if not exists inspiration_photo_comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references inspiration_photos (id) on delete cascade,
  x numeric not null check (x >= 0 and x <= 100),
  y numeric not null check (y >= 0 and y <= 100),
  comment text not null,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inspiration_photo_comments_photo_id_idx
  on inspiration_photo_comments (photo_id);

alter table inspiration_photo_comments enable row level security;

create policy "inspiration_photo_comments: select by wedding members"
on inspiration_photo_comments for select
to authenticated
using (
  exists (
    select 1
    from inspiration_photos p
    join wedding_members wm on wm.wedding_id = p.wedding_id
    where p.id = inspiration_photo_comments.photo_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor', 'viewer')
  )
);

create policy "inspiration_photo_comments: insert by editors"
on inspiration_photo_comments for insert
to authenticated
with check (
  exists (
    select 1
    from inspiration_photos p
    join wedding_members wm on wm.wedding_id = p.wedding_id
    where p.id = inspiration_photo_comments.photo_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor')
  )
);

create policy "inspiration_photo_comments: delete by editors"
on inspiration_photo_comments for delete
to authenticated
using (
  exists (
    select 1
    from inspiration_photos p
    join wedding_members wm on wm.wedding_id = p.wedding_id
    where p.id = inspiration_photo_comments.photo_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor')
  )
);
