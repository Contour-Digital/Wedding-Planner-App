# Wedding Planner

A collaborative, universal wedding planning app — Next.js (App Router) + TypeScript + Tailwind CSS on the frontend, Supabase (Postgres, Auth, Realtime, Storage) on the backend. Mobile-first, installable as a PWA.

## Why this stack / structure

- **Next.js App Router** gives server components for the initial auth/redirect check (`src/app/page.tsx`) and client components for everything interactive, without a separate API server.
- **Supabase** provides Postgres + Row Level Security, Auth, and Realtime in one place, which maps directly onto the spec's requirements (multi-user, permissions enforced server-side, live sync).
- **One wedding = one tenant.** Every table carries `wedding_id`, and RLS policies (not frontend checks) decide who can read/write which rows. See the big comment block at the top of `supabase/migrations/0001_init.sql` for the full reasoning, especially around how "Timeline Only" sharing is enforced.

## Folder structure

```
src/
  app/
    login/, signup/, onboarding/     — auth + first-run wedding creation
    (app)/                           — everything behind auth, wrapped in the app shell
      dashboard/  tasks/  budget/  vendors/  vendors/[vendorId]/
      wedding-day/  wedding-day/print/  sharing/  activity/  settings/
      layout.tsx                     — sidebar (desktop) + bottom nav (mobile)
  components/
    ui/            — Button, Input, Card, Badge, Modal, ProgressBar (design system primitives)
    nav/           — Header, Sidebar, BottomNav, nav item list
    dashboard/, budget/, vendors/, tasks/, wedding-day/, sharing/, settings/, activity/
  lib/
    supabase/      — browser client, server client, middleware session refresh
    types/         — database.ts (schema mirror), domain.ts (derived types)
    hooks/         — one hook per resource (useExpenses, useTasks, useVendors, useTimeline, …),
                     each wired to Supabase Realtime via useRealtimeTable
    utils/         — currency, date, paymentStatus (the automatic status engine), budget math, permissions
    wedding/       — WeddingProvider: loads the signed-in user's membership + active wedding + role
    activity/      — logActivity() helper, called after every meaningful mutation
supabase/
  migrations/0001_init.sql — full schema, RLS policies, triggers, seed function
```

Every feature area (budget, vendors, tasks, wedding day, sharing, activity, settings) is its own
folder of components plus one or two hooks — new features (guest list, RSVPs, seating chart, etc.)
can be added the same way without touching existing modules.

## Getting started

1. **Create a Supabase project** at supabase.com.
2. **Run the migration**: paste `supabase/migrations/0001_init.sql` into the SQL editor and run it
   (or `supabase db push` if you're using the CLI). This creates every table, the RLS policies, the
   ceremony-time-sync trigger, the `timeline_events_shared` view, and a `create_wedding_for_current_user`
   helper function used by the onboarding screen.
3. **Copy `.env.example` to `.env.local`** and fill in your project's URL and anon key (Project
   Settings → API in the Supabase dashboard).
4. **Install and run**:
   ```
   npm install
   npm run dev
   ```
5. Sign up, name the couple, and you're in. Invite a second account (or another browser/incognito
   window) via Settings → Sharing to see live sync in action.

> Note: this environment's sandbox could not reach the npm registry to install dependencies or run a
> build, so `npm install` / `npm run build` should be your first step locally to confirm everything
> compiles — the code has been written and reviewed carefully, but hasn't been machine-verified by a
> compiler yet.

## How the spec's trickier requirements are implemented

- **Single source of truth for ceremony time**: `weddings.ceremony_time` is the only place it's
  edited (Settings). A Postgres trigger (`sync_ceremony_time`) pushes any change onto the one
  `timeline_events` row with `managed_type = 'ceremony'`, and a second trigger blocks direct edits
  to that row's `start_time` so the two values can never diverge.
- **Automatic payment status**: `lib/utils/paymentStatus.ts` is the single function that computes
  Not Started / Deposit Paid / Partially Paid / Paid in Full / Overdue from an expense's deposit +
  instalments, with Overdue always taking priority. Both the Budget page and vendor detail pages
  call this one function, so the logic can't drift between screens.
- **Timeline-only sharing enforced at the database, not just the UI**: the base `timeline_events`
  table (which has `private_notes`) is only selectable by `owner`/`editor` via RLS. A separate
  `timeline_events_shared` Postgres view — which simply does not include the `private_notes` column
  — is what `timeline_viewer` and `viewer` roles query instead. Even a compromised or buggy frontend
  cannot leak private notes, because the column never leaves the database for those roles.
- **Categories are safe to rename/delete**: renaming just updates the category row (expenses keep
  their `category_id`, so they "move" for free); deleting reassigns any linked expenses to a
  permanent "Uncategorised" category rather than deleting or orphaning them.
- **Multiple instalments per expense**: `expense_instalments` is a plain one-to-many table — no
  hardcoded deposit/final split — so the expense modal lets you add as many instalments as needed.
- **Realtime**: `useRealtimeTable` subscribes to Postgres changes scoped to `wedding_id` for
  timeline, tasks, expenses/instalments, vendors and activity — so Partner 2's screen updates the
  moment Partner 1 changes something.
- **Print run sheet**: `/wedding-day/print` reads only shared timeline fields (no private notes, no
  money) and uses `window.print()`; the app's `no-print` utility class hides all navigation chrome
  in print media via `globals.css`.

## What's intentionally deferred (and how to pick it up)

- **Vendor document uploads**: `vendor_documents.storage_path` and the DB comments already assume
  Supabase Storage at `weddings/{wedding_id}/vendors/{vendor_id}/documents/`. `DocumentManager`
  currently only takes a URL; swap its "add document" flow for a file input that uploads to that
  bucket path and writes `storage_path` instead of `external_url`.
- **Real reminders (email/push)**: `expense_instalments.reminder_days` is already captured; wire up
  a Supabase Edge Function on a cron schedule that queries instalments due within their
  `reminder_days` window and sends email/push.
- **Drag-and-drop run-sheet reordering**: the Up/Down buttons are fully functional and update
  `sort_order` in the database; if you want drag handles too, add `@dnd-kit/core` +
  `@dnd-kit/sortable` around the existing per-group list in `wedding-day/page.tsx` — the underlying
  reorder logic (`moveEvent`) is already isolated and reusable.
- **Guest list / RSVPs / seating chart / wedding website / gift tracking / honeymoon planning**:
  none of these are built, but the schema and folder pattern are designed so each becomes: a new
  migration table scoped by `wedding_id` with its own RLS policies, a `useX` hook, a components
  folder, and a new item in `ALL_NAV_ITEMS` — the same shape as every existing feature.
