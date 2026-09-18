-- Invites now generate the invitee's account (with a password handed to
-- them out of band) at invite-creation time rather than at accept time —
-- see /api/invite/route.ts. Every invited account gets email_confirm: true
-- immediately, so wedding_members_with_status.confirmed (originally
-- "has this person's email been confirmed" — migration 0013) would now
-- read true for every invite the instant it's created, even though nobody
-- has actually signed in yet. That's exactly the bug reported: opening a
-- freshly generated invite link showed "already accepted".
--
-- Switches the signal to whether Supabase has ever actually recorded a
-- sign-in for that account (auth.users.last_sign_in_at) — true only once
-- the invitee has actually used their credentials, which is what "Active"
-- vs "Invited" on the Sharing page is supposed to mean.
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
  (au.last_sign_in_at is not null) as confirmed
from public.wedding_members wm
left join public.profiles p on p.id = wm.user_id
left join auth.users au on au.id = wm.user_id
where public.wedding_role(wm.wedding_id) is not null;

grant select on public.wedding_members_with_status to authenticated;
