-- create_wedding_for_current_user() already receives p_partner_2_email (used
-- to seed the invite row) but never wrote it onto the wedding itself, and
-- had no way to know the caller's own email at all — so Settings' Partner
-- 1/2 email fields (migration 0018) always started empty even though
-- onboarding had already collected one of them. Same signature as the
-- version already in use (src/app/onboarding/page.tsx's rpc call), so
-- create or replace keeps the same function identity/grants — no dropping
-- needed, since the parameter list is unchanged.
--
-- Partner 1's email is looked up from auth.users rather than added as a
-- new parameter — it's simply the signed-in caller's own account email,
-- which the function can already see via auth.uid() (SECURITY DEFINER),
-- so there's nothing for the client to send.
create or replace function public.create_wedding_for_current_user(
  p_partner_1 text,
  p_partner_2 text,
  p_partner_2_email text default null,
  p_wedding_date date default null,
  p_location text default null,
  p_guest_count integer default null,
  p_currency text default 'USD',
  p_primary_colour text default '#9CAF98',
  p_secondary_colour text default '#FFFFFF',
  p_total_budget numeric default 0,
  p_categories jsonb default null,
  p_joint_email text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_wedding_id uuid;
  v_partner_1_email text;
  v_default_categories text[] := array['Venue', 'Food & Drink', 'Photography', 'Videography', 'Attire', 'Flowers', 'Entertainment', 'Transport', 'Stationery', 'Accommodation', 'Other'];
  v_name text;
  v_cat jsonb;
  v_i integer := 0;
begin
  select email into v_partner_1_email from auth.users where id = auth.uid();

  insert into public.weddings (
    partner_1, partner_2, wedding_date, location, guest_count, currency,
    primary_colour, secondary_colour, total_budget, joint_email,
    partner_1_email, partner_2_email, created_by
  )
  values (
    p_partner_1, p_partner_2, p_wedding_date, nullif(trim(coalesce(p_location, '')), ''), p_guest_count, p_currency,
    p_primary_colour, p_secondary_colour, coalesce(p_total_budget, 0),
    nullif(trim(coalesce(p_joint_email, '')), ''),
    v_partner_1_email,
    nullif(trim(coalesce(p_partner_2_email, '')), ''),
    auth.uid()
  )
  returning id into v_wedding_id;

  insert into public.wedding_members (wedding_id, user_id, role)
  values (v_wedding_id, auth.uid(), 'owner');

  if p_partner_2_email is not null and length(trim(p_partner_2_email)) > 0 then
    insert into public.wedding_members (wedding_id, invited_email, role)
    values (v_wedding_id, lower(trim(p_partner_2_email)), 'editor');
  end if;

  if p_categories is not null and jsonb_array_length(p_categories) > 0 then
    for v_cat in select * from jsonb_array_elements(p_categories) loop
      insert into public.expense_categories (wedding_id, name, target_budget, sort_order)
      values (
        v_wedding_id,
        v_cat ->> 'name',
        coalesce((v_cat ->> 'target_budget')::numeric, 0),
        v_i
      );
      v_i := v_i + 1;
    end loop;
  else
    foreach v_name in array v_default_categories loop
      insert into public.expense_categories (wedding_id, name, sort_order)
      values (v_wedding_id, v_name, v_i);
      v_i := v_i + 1;
    end loop;
  end if;

  insert into public.expense_categories (wedding_id, name, sort_order, is_uncategorised)
  values (v_wedding_id, 'Uncategorised', v_i, true);

  insert into public.timeline_events (wedding_id, group_name, sort_order, title, managed_type)
  values (v_wedding_id, 'ceremony', 0, 'Ceremony', 'ceremony');

  return v_wedding_id;
end;
$function$;
