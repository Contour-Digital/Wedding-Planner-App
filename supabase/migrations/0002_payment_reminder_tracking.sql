-- Payment due reminders: tracking + the query the Edge Function runs.
--
-- last_reminder_sent_at guards against sending the same instalment's
-- reminder twice on one day if the daily job is retried or somehow runs
-- more than once — the function below only returns rows whose last send
-- (if any) was before today, and the Edge Function stamps this column
-- immediately after each successful send.
alter table expense_instalments
  add column if not exists last_reminder_sent_at timestamptz;

-- PostgREST filters compare a column to a literal, not two columns to each
-- other, so "due_date within reminder_days of today" (a per-row, dynamic
-- window) can't be expressed as a normal .eq()/.lte() query from the Edge
-- Function. This function does that comparison in SQL instead and joins
-- straight to the wedding owner's email, so the function only has to loop
-- over already-filtered, ready-to-send rows.
--
-- SECURITY DEFINER because it reads across expenses/weddings/
-- wedding_members/profiles regardless of caller — safe here because only
-- the service_role is granted EXECUTE (below), which is what the
-- payment-reminders Edge Function authenticates as; it's never reachable
-- from the browser's anon/authenticated roles.
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
  joint_email text
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
    w.joint_email
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
