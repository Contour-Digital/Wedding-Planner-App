-- Rate limiting for /api/invite. A DB-backed log rather than in-memory
-- state, since the route runs on stateless serverless functions — an
-- in-memory counter would reset (and could be trivially bypassed) on every
-- cold start or across concurrent instances.
--
-- Every POST /api/invite that passes the owner check logs a row here
-- *before* doing any Resend/Supabase-admin work, so even failed sends
-- count toward the limit (otherwise retrying a failing send would be a
-- free way around it). The route counts rows for the wedding in the last
-- rolling hour and rejects with 429 past the threshold.
create table if not exists invite_requests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists invite_requests_wedding_id_created_at_idx
  on invite_requests (wedding_id, created_at desc);

-- No policies: this table is only ever written/read by the service-role
-- client inside the /api/invite route handler (never from the browser's
-- anon/authenticated roles), so RLS-enabled-with-no-policies is a deny-all
-- for everyone except service_role, which bypasses RLS entirely.
alter table invite_requests enable row level security;
