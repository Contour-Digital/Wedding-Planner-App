-- Supabase security advisor: auth_users_exposed (ERROR) on
-- wedding_members_with_status, plus security_definer_view on the same view.
--
-- The view joined auth.users directly and ran with its owner's (postgres)
-- privileges, and Supabase's default grants had given anon and authenticated
-- full privileges on it. The WHERE wedding_role(...) is not null clause meant
-- nobody actually got rows outside their own weddings (anon gets none, since
-- auth.uid() is null), but the whole of that isolation rested on one WHERE
-- clause in a view that can read every auth.users row. The only thing the
-- view needs from auth.users is "has this person ever signed in" (migration
-- 0016), so:
--
-- 1. That one boolean now comes from private.member_has_signed_in(), a
--    SECURITY DEFINER function in a schema PostgREST doesn't expose. It only
--    answers for yourself or someone you share a wedding with, and returns
--    nothing but true/false.
-- 2. The view no longer references auth.users at all, and runs as the
--    caller (security_invoker), so wedding_members' and profiles' own RLS
--    policies apply on top of the existing WHERE clause.
-- 3. anon loses all access to the view; authenticated keeps SELECT only.
--
-- Column names, types and the nested `profile` jsonb are unchanged, so
-- useMembers() and everything reading WeddingMember needs no changes.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.member_has_signed_in(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users au
    where au.id = p_user_id
      and au.last_sign_in_at is not null
      and (
        au.id = auth.uid()
        or exists (
          select 1
          from public.wedding_members mine
          join public.wedding_members theirs on theirs.wedding_id = mine.wedding_id
          where mine.user_id = auth.uid()
            and theirs.user_id = p_user_id
        )
      )
  );
$$;

revoke all on function private.member_has_signed_in(uuid) from public, anon;
grant execute on function private.member_has_signed_in(uuid) to authenticated;

create or replace view public.wedding_members_with_status
with (security_invoker = true)
as
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
  (wm.user_id is not null and private.member_has_signed_in(wm.user_id)) as confirmed
from public.wedding_members wm
left join public.profiles p on p.id = wm.user_id
where public.wedding_role(wm.wedding_id) is not null;

revoke all on public.wedding_members_with_status from public, anon, authenticated;
grant select on public.wedding_members_with_status to authenticated;
