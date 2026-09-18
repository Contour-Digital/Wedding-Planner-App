-- Stop nulling wedding_members.invited_email the instant an invite is
-- claimed (the moment /api/invite creates the auth.users row, at send
-- time — long before the invitee actually confirms). That left no record
-- anywhere of which address an invite even went to for the entire
-- "invited but not yet confirmed" window, so if anything ever went wrong
-- downstream (the profiles row missing, as found live via a direct join
-- of wedding_members/profiles/auth.users — two rows with user_id set,
-- invited_email already null, and no matching profiles row at all), the
-- target address became permanently unrecoverable: the Sharing page's
-- "Resend invite" button correctly disappears for a member with nowhere
-- left to send to, which is exactly the bug reported ("resend button
-- gone for everyone" — every non-owner member on that wedding was in
-- this state).
--
-- Confirmed safe against the live wedding_members_identity check
-- constraint before writing this — it's `user_id IS NOT NULL OR
-- invited_email IS NOT NULL` (an OR, not an exclusive one), so having
-- both columns set at once, which this now does for every claimed
-- invite going forward, is fine.
--
-- The claim UPDATE only ever runs once per email (it's an AFTER INSERT
-- trigger on auth.users, which enforces unique emails, so it can't
-- refire for the same address later), so leaving invited_email in place
-- doesn't risk it being touched again after this.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), new.email);

  delete from public.wedding_members wm
  using public.wedding_members newer
  where wm.invited_email = lower(new.email)
    and newer.invited_email = lower(new.email)
    and wm.wedding_id = newer.wedding_id
    and (wm.created_at, wm.id) > (newer.created_at, newer.id);

  -- Claim any pending invites sent to this email address before they
  -- signed up. invited_email is intentionally left set here — see above.
  update public.wedding_members
  set user_id = new.id
  where invited_email = lower(new.email);

  return new;
end;
$function$;
