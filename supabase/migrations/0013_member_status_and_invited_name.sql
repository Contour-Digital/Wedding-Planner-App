-- Sharing "People with access": show each person's real name/email once
-- invited, and whether they've actually completed their invite — not just
-- whether wedding_members.user_id is set, since that gets stamped the
-- moment an invite is *sent* (as soon as /api/invite creates their
-- auth.users row), not when they actually click the link and confirm.
-- Before this, a not-yet-confirmed invite already looked identical to a
-- fully active member to the rest of the app.

alter table wedding_members add column if not exists invited_name text;

-- auth.users isn't exposed to PostgREST directly (correctly — it holds
-- far more than the one field the UI needs), so this view surfaces just
-- email_confirmed_at, nothing else from that table. Views run with their
-- owner's privileges against underlying tables by default (the classic
-- Postgres view security model, the same mechanism SECURITY DEFINER
-- functions use more explicitly), which is what lets this read auth.users
-- at all — but views don't carry their own RLS policies the way tables
-- do, so `where wedding_role(wm.wedding_id) is not null` in the view body
-- is what keeps it properly scoped per caller: the same isolation
-- guarantee as every RLS policy elsewhere, just expressed in the WHERE
-- clause instead.
--
-- `profile` stays a nested jsonb object (not flat profile_full_name/
-- profile_email columns) so it's a drop-in replacement for the old
-- `profile:profiles(*)` embed — TaskRow and TaskModal's useMembers() usage
-- (m.profile?.full_name, m.profile?.email) needs no changes.
create or replace view public.wedding_members_with_status as
select
  wm.id,
  wm.wedding_id,
  wm.user_id,
  wm.invited_email,
  wm.invited_name,
  wm.role,
  wm.created_at,
  case when p.id is not null
    then jsonb_build_object('id', p.id, 'full_name', p.full_name, 'email', p.email)
    else null
  end as profile,
  (au.email_confirmed_at is not null) as confirmed
from public.wedding_members wm
left join public.profiles p on p.id = wm.user_id
left join auth.users au on au.id = wm.user_id
where public.wedding_role(wm.wedding_id) is not null;

grant select on public.wedding_members_with_status to authenticated;
