# payment-reminders

Daily digest of upcoming instalment payments, emailed to the wedding owner
(and `joint_email`/`partner_1_email`/`partner_2_email`, wherever set) via
Resend. See `index.ts` for what it queries and sends.

## Deploy

```
supabase functions deploy payment-reminders
supabase secrets set RESEND_API_KEY=re_your_key_here
# optional, defaults to "Wedding Planner <onboarding@resend.dev>":
supabase secrets set RESEND_FROM_EMAIL="Wedding Planner <reminders@yourdomain.com>"
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` don't need to be set — every
Edge Function gets those automatically.

## Scheduling (manual step — can't be done from code)

Pick one. Both call the function once a day; the function itself is
idempotent for the day via `last_reminder_sent_at`, so calling it more than
once won't double-send.

### Option A — Supabase Dashboard cron trigger (simplest, no extensions needed)

Dashboard → **Edge Functions** → `payment-reminders` → **Cron** tab → add a
schedule (e.g. `0 8 * * *` for 8am UTC daily). This doesn't require
`pg_cron`/`pg_net` to be enabled on the database at all.

### Option B — pg_cron + pg_net (if you'd rather keep the schedule in SQL)

1. Dashboard → **Database** → **Extensions** → enable `pg_cron` and `pg_net`
   (both need to be turned on from the dashboard; there's no SQL-only way to
   enable an extension the project doesn't already have).
2. Run this in the SQL Editor, filling in your project ref and a service
   role key. **Don't commit this SQL anywhere with the real key filled
   in** — that key has full database access. It's only in this README as
   documentation, not as a migration file, precisely so it never gets
   applied (and the key never gets committed) automatically.

   ```sql
   select cron.schedule(
     'payment-reminders-daily',
     '0 8 * * *', -- 8am UTC daily
     $$
     select net.http_post(
       url := 'https://YOUR_PROJECT_REF.functions.supabase.co/payment-reminders',
       headers := jsonb_build_object(
         'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
         'Content-Type', 'application/json'
       ),
       body := '{}'::jsonb
     );
     $$
   );
   ```

   To stop it later: `select cron.unschedule('payment-reminders-daily');`

## Testing it manually

```
curl -X POST https://YOUR_PROJECT_REF.functions.supabase.co/payment-reminders \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

Returns `{ ok, checked, sent, skipped, failures }` — `skipped` counts
instalments whose wedding has no resolvable owner/joint email, `failures`
lists per-instalment Resend errors (the run still stamps
`last_reminder_sent_at` only for ones that actually sent, so failures are
retried on the next run).
