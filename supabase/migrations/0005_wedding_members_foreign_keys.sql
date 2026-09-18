-- Fix "Failed to load resource: 400" on GET /rest/v1/wedding_members
-- wherever it's queried with the profile:profiles(*) embed (useMembers.ts —
-- used by Sharing, TaskRow, and TaskModal, so this broke all three).
--
-- Confirmed via information_schema.table_constraints: wedding_members has
-- NO foreign keys at all. PostgREST resolves an embedded-resource select
-- like `select=*,profile:profiles(*)` by looking up a foreign key between
-- the two tables to build the join — with none present, it can't infer the
-- relationship and returns 400 (PGRST200, "Could not find a relationship
-- between 'wedding_members' and 'profiles' in the schema cache").
--
-- Cleans up any orphaned rows first — a wedding_id or user_id pointing
-- nowhere would otherwise make adding the constraint itself fail — then
-- adds both foreign keys the schema clearly intends (wedding_id and
-- user_id are named and used everywhere in the app as real references,
-- they just never got the actual constraints).

-- A membership row whose wedding no longer exists serves no purpose.
delete from public.wedding_members wm
where not exists (select 1 from public.weddings w where w.id = wm.wedding_id);

-- A membership row whose user_id points at a deleted/nonexistent profile
-- is bad data. If it has an invited_email to fall back to, the membership
-- itself (role, wedding_id) is still meaningful — null the dangling
-- reference rather than deleting the row, the same way a not-yet-claimed
-- invite already has a null user_id. But if invited_email is ALSO null
-- (a fully-claimed membership whose user was later deleted, e.g. during a
-- manual cleanup), nulling user_id would leave the row with no identity
-- at all — the live database's wedding_members_identity check constraint
-- (not defined in this repo; part of the base schema) requires at least
-- one of user_id/invited_email to be set, and rejects that. Such a row is
-- genuinely meaningless (nobody to resolve it to, nothing to re-invite),
-- so it's deleted outright instead of updated.
delete from public.wedding_members wm
where wm.user_id is not null
  and wm.invited_email is null
  and not exists (select 1 from public.profiles p where p.id = wm.user_id);

update public.wedding_members wm
set user_id = null
where wm.user_id is not null
  and wm.invited_email is not null
  and not exists (select 1 from public.profiles p where p.id = wm.user_id);

-- Postgres has no ADD CONSTRAINT IF NOT EXISTS (only indexes get that),
-- so each is guarded explicitly — safe to run this file again even if a
-- previous attempt already got partway through.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'wedding_members_wedding_id_fkey'
  ) then
    alter table public.wedding_members
      add constraint wedding_members_wedding_id_fkey
      foreign key (wedding_id) references public.weddings (id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'wedding_members_user_id_fkey'
  ) then
    alter table public.wedding_members
      add constraint wedding_members_user_id_fkey
      foreign key (user_id) references public.profiles (id) on delete set null;
  end if;
end $$;
