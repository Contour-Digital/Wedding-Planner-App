-- Lets an expense be marked as a gift (e.g. a wedding dress the parents paid
-- for). A gift isn't the couple's money: the app leaves it out of committed
-- spend and category totals, shows it with no outstanding amount, leaves its
-- instalments out of upcoming payments, and payment-due reminders skip it. Defaults to false, so every existing expense
-- stays exactly as it was.
alter table public.expenses
  add column is_gift boolean not null default false;

-- Same output columns as 0019, so a plain create or replace is enough here;
-- the only change is the "and e.is_gift = false" filter.
create or replace function public.expense_instalments_due_for_reminder()
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
    and e.is_gift = false
    and ei.reminder_days is not null
    and ei.due_date is not null
    and ei.due_date >= current_date
    and ei.due_date <= current_date + ei.reminder_days
    and (ei.last_reminder_sent_at is null or ei.last_reminder_sent_at::date < current_date);
$$;

revoke all on function public.expense_instalments_due_for_reminder() from public, anon, authenticated;
grant execute on function public.expense_instalments_due_for_reminder() to service_role;
