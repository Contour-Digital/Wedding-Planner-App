-- Individual email addresses for each partner, alongside the phone numbers
-- added in migration 0017 — shown on Settings and the Contacts tab the
-- same way. Separate from weddings.joint_email (used only for invite
-- reply-to) and from either partner's actual login email (their real
-- account identity, which this never touches) — this is just contact
-- info for the day, same as the phone columns.
alter table weddings add column if not exists partner_1_email text;
alter table weddings add column if not exists partner_2_email text;
