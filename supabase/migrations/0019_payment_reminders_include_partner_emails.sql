-- Adds partner_1_email/partner_2_email (migration 0018) as extra recipients
-- for payment-due reminder emails, alongside the wedding owner's account
-- email and joint_email — same idea as joint_email, just per-partner.
--
-- create or replace function can't change a table-returning function's
-- output columns, so this drops and recreates it (as 0002 originally did),
-- re-applying the same service_role-only grant.
drop function if exists public.expense_instalments_due_for_reminder();

create function public.expense_instalments_due_for_reminder()
returns table (
  instalment_id uuid,
  expense_id uuid,
  wedding_id uuid,
  expense_name text,
  amount numeric,
  due_date date,
  currency text,
  owner_email text,
  joint_email text,
  partner_1_email text,
  partner_2_email text
)
language sql
security definer
set search_path = public
as $$
  select
    ei.id as instalment_id,
    e.id as expense_id,
    e.wedding_id,
    e.name as expense_name,
    ei.amount,
    ei.due_date,
    w.currency,
    p.email as owner_email,
    w.joint_email,
    w.partner_1_email,
    w.partner_2_email
  from expense_instalments ei
  join expenses e on e.id = ei.expense_id
  join weddings w on w.id = e.wedding_id
  join wedding_members wm on wm.wedding_id = w.id and wm.role = 'owner'
  join profiles p on p.id = wm.user_id
  where ei.paid = false
    and ei.reminder_days is not null
    and ei.due_date is not null
    and ei.due_date >= current_date
    and ei.due_date <= current_date + ei.reminder_days
    and (ei.last_reminder_sent_at is null or ei.last_reminder_sent_at::date < current_date);
$$;

revoke all on function public.expense_instalments_due_for_reminder() from public, anon, authenticated;
grant execute on function public.expense_instalments_due_for_reminder() to service_role;
