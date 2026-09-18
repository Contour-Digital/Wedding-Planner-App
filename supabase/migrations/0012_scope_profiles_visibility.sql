-- profiles had "SELECT ... USING (true)" — readable by ANY authenticated
-- user platform-wide, not just people who share a wedding with you. That's
-- a real cross-tenant leak (every user's full_name + email visible to
-- every other signed-up user, unrelated weddings included), found during
-- an explicit isolation audit of every RLS policy in the app.
--
-- Replaced with: your own profile, or anyone you share at least one
-- wedding with (needed for the Sharing member list, task assignee names,
-- activity log attribution, etc. — all of which only ever look up
-- profiles of people on a wedding you're already a member of).
--
-- Unaffected: /api/invite's own profiles lookup (existingProfile) runs
-- through the service-role client, which bypasses RLS entirely.
drop policy if exists "profiles are readable by anyone authenticated" on profiles;

create policy "profiles readable by self or co-members"
on profiles for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from wedding_members mine
    join wedding_members theirs on theirs.wedding_id = mine.wedding_id
    where mine.user_id = auth.uid()
      and theirs.user_id = profiles.id
  )
);
