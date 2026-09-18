-- A personal phone number per user, alongside the existing full_name and
-- email — shown on the new "Your profile" section of Settings (every
-- member, not just owner/editor). Separate from weddings.partner_1_phone/
-- partner_2_phone (migration 0017), which are the couple's own day-of
-- contact numbers shown on the Contacts tab — this is any member's own
-- number, e.g. a bridesmaid or coordinator with an account.
alter table profiles add column if not exists phone text;
