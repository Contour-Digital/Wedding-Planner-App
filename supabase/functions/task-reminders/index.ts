// Daily task-due reminder pushes — the task equivalent of payment-reminders,
// but push-only (no email channel for tasks). Queries
// tasks_due_for_reminder() (see
// supabase/migrations/0020_push_notifications.sql) for incomplete tasks due
// within a day, or overdue, that haven't had a reminder sent today, and
// stamps last_reminder_sent_at on each one it sends at least one push for
// (unlike payment reminders, it keeps firing daily once overdue rather than
// stopping the day it was due — see that migration's comment for why).
//
// Deploy: supabase functions deploy task-reminders
// Secrets: same VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY as payment-reminders
//   (see that function's README) — no separate secrets needed.
// Schedule: same as payment-reminders — see that folder's README for the
//   two scheduling options (Dashboard cron trigger, or pg_cron + pg_net).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { sendPushToUser } from "../_shared/push.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface DueTask {
  task_id: string;
  wedding_id: string;
  title: string;
  due_date: string;
  assigned_user_id: string | null;
  assigned_to_both: boolean;
}

function formatDueDate(dueDate: string) {
  const isOverdue = new Date(`${dueDate}T00:00:00`) < new Date(new Date().toDateString());
  const label = new Date(`${dueDate}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return { isOverdue, label };
}

Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: due, error } = await supabase.rpc("tasks_due_for_reminder");
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let skipped = 0;

  for (const row of (due ?? []) as DueTask[]) {
    let recipientIds: string[] = [];
    if (row.assigned_user_id) {
      recipientIds = [row.assigned_user_id];
    } else {
      // Assigned to both, or unassigned — either way, whoever's managing
      // tasks (owner/editor) should know it needs attention.
      const { data: members } = await supabase
        .from("wedding_members")
        .select("user_id, role")
        .eq("wedding_id", row.wedding_id)
        .in("role", ["owner", "editor"]);
      recipientIds = (members ?? [])
        .map((m: { user_id: string | null }) => m.user_id)
        .filter((id: string | null): id is string => !!id);
    }

    if (recipientIds.length === 0) {
      skipped += 1;
      continue;
    }

    const { isOverdue, label } = formatDueDate(row.due_date);
    await Promise.all(
      recipientIds.map((id) =>
        sendPushToUser(supabase, id, row.wedding_id, "task_due", {
          title: isOverdue ? "Task overdue" : "Task due soon",
          body: isOverdue ? `"${row.title}" was due ${label}.` : `"${row.title}" is due ${label}.`,
          url: "/tasks",
        }).catch(() => {})
      )
    );

    sent += 1;
    await supabase.from("tasks").update({ last_reminder_sent_at: new Date().toISOString() }).eq("id", row.task_id);
  }

  return new Response(JSON.stringify({ ok: true, checked: due?.length ?? 0, sent, skipped }), {
    headers: { "Content-Type": "application/json" },
  });
});
