-- Budget quotes: prices the couple is weighing up under a budget category
-- (e.g. three photographers) before they commit to one. A quote is never
-- an expense, so it stays out of Committed, Paid, Outstanding and every
-- category total; the Budget page shows it as a separate "considering"
-- figure instead.
--
-- status moves considering -> accepted (the couple went ahead; expense_id
-- points at the expense it became) or considering -> declined (hidden from
-- the category but kept, so they can look back at what they turned down
-- and why). A declined quote can be restored to considering.
--
-- Financial data, so the same role split as expenses: only owner/editor
-- can see or change it (canSeeFinancials() / canEdit() in
-- src/lib/utils/permissions.ts).

create table if not exists expense_quotes (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  category_id uuid references expense_categories (id) on delete set null,
  vendor_id uuid references vendors (id) on delete set null,
  vendor_name text not null,
  amount numeric not null default 0,
  notes text,
  status text not null default 'considering' check (status in ('considering', 'accepted', 'declined')),
  expense_id uuid references expenses (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expense_quotes_wedding_id_idx on expense_quotes (wedding_id);
create index if not exists expense_quotes_category_id_idx on expense_quotes (category_id);

alter table expense_quotes enable row level security;

drop policy if exists "expense_quotes: select by couple" on expense_quotes;
create policy "expense_quotes: select by couple"
on expense_quotes for select
to authenticated
using (is_wedding_editor(wedding_id));

drop policy if exists "expense_quotes: insert by couple" on expense_quotes;
create policy "expense_quotes: insert by couple"
on expense_quotes for insert
to authenticated
with check (is_wedding_editor(wedding_id));

drop policy if exists "expense_quotes: update by couple" on expense_quotes;
create policy "expense_quotes: update by couple"
on expense_quotes for update
to authenticated
using (is_wedding_editor(wedding_id))
with check (is_wedding_editor(wedding_id));

drop policy if exists "expense_quotes: delete by couple" on expense_quotes;
create policy "expense_quotes: delete by couple"
on expense_quotes for delete
to authenticated
using (is_wedding_editor(wedding_id));

-- Live sync across everyone on the Budget page, same as expenses. Guarded
-- so re-running this file doesn't fail on "already a member".
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'expense_quotes'
  ) then
    alter publication supabase_realtime add table public.expense_quotes;
  end if;
end $$;
