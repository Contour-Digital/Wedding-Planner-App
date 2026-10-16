-- Lets the couple tick off an unpaid instalment as "saved": the money is put
-- aside in the account ready for when it's due. It's separate from paid (the
-- vendor hasn't been paid yet), so reminders and paid/outstanding totals are
-- unchanged; the Upcoming Payments list uses it to show how much of what's
-- outstanding is already saved. Defaults to false, so every existing
-- instalment stays exactly as it was. Existing RLS on expense_instalments
-- already covers who can update it.
alter table public.expense_instalments
  add column saved boolean not null default false;
