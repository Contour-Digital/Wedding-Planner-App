-- Distinguishes a "Balance" instalment (its amount is always whatever's
-- left of the expense — auto-calculated client-side, never typed in) from
-- a "Custom" one (a fixed amount the couple entered themselves). A NOT
-- NULL column with a default backfills every existing instalment as
-- 'custom', which is exactly what they already were.
alter table public.expense_instalments
  add column kind text not null default 'custom' check (kind in ('balance', 'custom'));
