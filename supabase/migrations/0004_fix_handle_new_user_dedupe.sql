-- Fix "Database error saving new user" on Sharing → Invite someone.
--
-- Root cause (confirmed from Supabase Postgres logs — a 23505 duplicate
-- key on wedding_members_wedding_id_user_id_key, immediately followed by
-- "current transaction is aborted", right where GoTrue's user-creation
-- transaction runs): public.handle_new_user() — the trigger that fires on
-- every auth.users insert to create a profile — also claims any pending
-- wedding_members row for the new user's email:
--
--   update public.wedding_members
--   set user_id = new.id, invited_email = null
--   where invited_email = lower(new.email);
--
-- This UPDATE isn't scoped to "at most one row per wedding_id". If the
-- same email ever ended up with two pending (invited_email set, user_id
-- still null) rows for the SAME wedding — e.g. one created by onboarding's
-- create_wedding_for_current_user() (entering partner 2's email) and a
-- second created later by actually inviting that same address from
-- Sharing, before they'd signed up — this single statement tries to set
-- the same (wedding_id, user_id) on both rows at once, and the second one
-- collides with the unique constraint. Because this runs inside the same
-- transaction as the auth.users insert, the whole insert rolls back and
-- Supabase Auth reports the generic "Database error saving new user" —
-- the real 23505 never reaches the app.
--
-- Two parts: clean up whatever duplicate pending row already exists (so
-- whichever invite is currently stuck can go through once this runs), and
-- make the trigger self-healing so a future duplicate can't cause this
-- again.

-- One-time cleanup: for any (wedding_id, invited_email) with more than one
-- still-pending row, keep only the oldest and drop the rest. Scoped to
-- invited_email is not null so this can never touch an already-claimed
-- (real user_id) membership row.
delete from public.wedding_members wm
using public.wedding_members newer
where wm.invited_email is not null
  and newer.invited_email is not null
  and wm.wedding_id = newer.wedding_id
  and wm.invited_email = newer.invited_email
  and (wm.created_at, wm.id) > (newer.created_at, newer.id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), new.email);

  -- Same dedupe as the one-time cleanup above, run defensively on every
  -- signup and scoped to just this email: if a duplicate pending row has
  -- snuck back in (same wedding_id, more than one invited_email row for
  -- this address), drop the extras before claiming, so the claim below
  -- can never match more than one row per wedding_id and can never
  -- collide with the unique constraint again.
  delete from public.wedding_members wm
  using public.wedding_members newer
  where wm.invited_email = lower(new.email)
    and newer.invited_email = lower(new.email)
    and wm.wedding_id = newer.wedding_id
    and (wm.created_at, wm.id) > (newer.created_at, newer.id);

  -- Claim any pending invites sent to this email address before they signed up.
  update public.wedding_members
  set user_id = new.id, invited_email = null
  where invited_email = lower(new.email);

  return new;
end;
$function$;
