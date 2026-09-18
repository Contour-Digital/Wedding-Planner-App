-- Web Push infrastructure: a subscription per browser/device a user has
-- enabled notifications on, a set of per-wedding category toggles (the
-- Notifications tab), and the scheduled-reminder query for tasks — the
-- same shape as expense_instalments_due_for_reminder() (migration 0002),
-- since tasks don't have a due-reminder query yet.
--
-- Both new tables are strictly self-service: a user manages their own
-- subscriptions and preferences only, never another member's — RLS here
-- is auth.uid() = user_id, not the wedding_role()/is_wedding_editor()
-- pattern used elsewhere, since wedding membership isn't the access
-- boundary for this data. Sending a push to someone ELSE (e.g. notifying
-- a task's assignee) reads across users and happens server-side with the
-- service_role client instead, same as /api/invite.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

drop policy if exists "push_subscriptions: manage own" on push_subscriptions;
create policy "push_subscriptions: manage own"
on push_subscriptions for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists notification_preferences (
  user_id uuid not null references auth.users (id) on delete cascade,
  wedding_id uuid not null references weddings (id) on delete cascade,
  payment_due boolean not null default true,
  task_assigned boolean not null default true,
  task_due boolean not null default true,
  member_joined boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, wedding_id)
);

alter table notification_preferences enable row level security;

drop policy if exists "notification_preferences: manage own" on notification_preferences;
create policy "notification_preferences: manage own"
on notification_preferences for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Mirrors expense_instalments_due_for_reminder()'s dedupe: a task only gets
-- (at most) one push per day. Unlike payment reminders, this keeps firing
-- once a task is overdue (no upper bound on due_date) rather than stopping
-- the day it was due — an unpaid instalment has its own "Overdue" status
-- shown elsewhere, but a task with nobody nudged about it just sits there,
-- so it nags daily until done.
alter table tasks add column if not exists last_reminder_sent_at timestamptz;

create or replace function public.tasks_due_for_reminder()
returns table (
  task_id uuid,
  wedding_id uuid,
  title text,
  due_date date,
  assigned_user_id uuid,
  assigned_to_both boolean
)
language sql
security definer
set search_path = public
as $$
  select
    t.id as task_id,
    t.wedding_id,
    t.title,
    t.due_date,
    t.assigned_user_id,
    t.assigned_to_both
  from tasks t
  where t.completed = false
    and t.due_date is not null
    and t.due_date <= current_date + 1
    and (t.last_reminder_sent_at is null or t.last_reminder_sent_at::date < current_date);
$$;

revoke all on function public.tasks_due_for_reminder() from public, anon, authenticated;
grant execute on function public.tasks_due_for_reminder() to service_role;
