-- "Completed" is being removed from the vendor status options (booked
-- already covers a vendor that's fully sorted — there's no separate
-- post-wedding "completed" state that added value). No existing vendor
-- rows use it (verified before writing this migration), so this is a
-- straight constraint tightening with no data to migrate.
alter table public.vendors drop constraint vendors_status_check;

alter table public.vendors add constraint vendors_status_check
  check (status = any (array['considering'::text, 'contacted'::text, 'quote_received'::text, 'booked'::text]));
