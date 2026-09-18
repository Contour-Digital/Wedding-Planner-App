# task-reminders

Daily push notification for incomplete tasks due within a day, or overdue —
the task equivalent of `payment-reminders`, push-only (no email channel).
See `index.ts` for what it queries and sends.

## Deploy

```
supabase functions deploy task-reminders
```

Uses the same `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` secrets as
`payment-reminders` — see that function's README for how to generate and
set them. Nothing extra to configure here.

## Scheduling

Same two options as `payment-reminders` (Dashboard cron trigger, or
pg_cron + pg_net) — see that function's README for the full steps. Pick a
time, e.g. `0 8 * * *` for 8am UTC daily.

## Testing it manually

```
curl -X POST https://YOUR_PROJECT_REF.functions.supabase.co/task-reminders \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

Returns `{ ok, checked, sent, skipped }` — `skipped` counts tasks with no
resolvable recipient (assigned to someone with no linked account, and no
owner/editor to fall back to).
