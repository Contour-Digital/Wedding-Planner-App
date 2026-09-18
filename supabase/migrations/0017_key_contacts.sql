-- Contacts tab: the couple's own phone numbers, a wedding-scoped list of
-- "key contacts" (celebrant, MC, photographer, family — whoever needs to be
-- reachable on the day), and the ability to surface specific vendor
-- contacts on that same list via a checkbox on the vendor's Contacts card.
--
-- Visible to every wedding member, Timeline Only included — day-of contact
-- info is exactly the kind of thing a run-sheet-only collaborator (an MC,
-- a coordinator) needs, same reasoning as why they can already see the
-- Wedding Day run sheet itself. Editable only by owner/editor, matching
-- every other wedding-scoped table.

alter table weddings add column if not exists partner_1_phone text;
alter table weddings add column if not exists partner_2_phone text;

create table if not exists key_contacts (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  role text,
  name text not null,
  phone text,
  email text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists key_contacts_wedding_id_idx on key_contacts (wedding_id);

alter table key_contacts enable row level security;

drop policy if exists "key_contacts: select by wedding members" on key_contacts;
create policy "key_contacts: select by wedding members"
on key_contacts for select
to authenticated
using (wedding_role(wedding_id) is not null);

drop policy if exists "key_contacts: insert by editors" on key_contacts;
create policy "key_contacts: insert by editors"
on key_contacts for insert
to authenticated
with check (is_wedding_editor(wedding_id));

drop policy if exists "key_contacts: update by editors" on key_contacts;
create policy "key_contacts: update by editors"
on key_contacts for update
to authenticated
using (is_wedding_editor(wedding_id))
with check (is_wedding_editor(wedding_id));

drop policy if exists "key_contacts: delete by editors" on key_contacts;
create policy "key_contacts: delete by editors"
on key_contacts for delete
to authenticated
using (is_wedding_editor(wedding_id));

-- Lets a specific vendor contact (not necessarily every contact a vendor
-- has — a sales rep shouldn't show up here, but the on-the-day coordinator
-- should) also appear on the Contacts tab.
alter table vendor_contacts add column if not exists show_in_contacts boolean not null default false;

-- vendor_contacts' own RLS is scoped through vendors and (per the app's
-- existing role split) likely excludes Timeline Only entirely, same as the
-- rest of the Vendors feature — canSeeVendorsAndTasks() in
-- src/lib/utils/permissions.ts never includes timeline_viewer. This view
-- exists to safely carve out just the flagged contacts for the Contacts
-- tab, which Timeline Only should be able to read, without changing (or
-- needing to know the exact definition of) that base policy. Views run
-- with their owner's privileges by default, bypassing the underlying
-- tables' RLS — the wedding_role(...) is not null check in the WHERE
-- clause is what keeps this properly scoped per caller instead, the same
-- pattern already used for wedding_members_with_status (migration 0013).
create or replace view public.day_of_vendor_contacts as
select
  vc.id,
  vc.vendor_id,
  v.name as vendor_name,
  vc.role,
  vc.name,
  vc.phone,
  vc.email,
  v.wedding_id
from public.vendor_contacts vc
join public.vendors v on v.id = vc.vendor_id
where vc.show_in_contacts = true
  and public.wedding_role(v.wedding_id) is not null;

grant select on public.day_of_vendor_contacts to authenticated;
