// Daily payment-due reminder emails.
//
// Queries expense_instalments_due_for_reminder() (see
// supabase/migrations/0002_payment_reminder_tracking.sql, extended by
// 0019_payment_reminders_include_partner_emails.sql) for unpaid instalments
// whose due_date falls within their own reminder_days window and that
// haven't had a reminder sent today, emails the wedding owner (and
// joint_email/partner_1_email/partner_2_email, wherever set) via Resend —
// same provider and HTML-email pattern as src/app/api/invite/route.ts — and
// stamps last_reminder_sent_at on each one it successfully sends, so a
// re-run today is a no-op for it. Also sends a push notification (see
// ../_shared/push.ts) to every owner/editor member with a linked account
// and the "payment_due" category on — a separate, best-effort channel from
// email, so its own failures never affect the tracking above.
//
// Deploy: supabase functions deploy payment-reminders
// Secrets: supabase secrets set RESEND_API_KEY=... [RESEND_FROM_EMAIL=...]
//   (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically
//   to every Edge Function — no need to set them yourself.)
// Schedule: see README.md in this folder — needs a manual step in the
// Supabase dashboard (pg_cron isn't enabled by default).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { sendPushToUser } from "../_shared/push.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Wedding Planner <onboarding@resend.dev>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface DueInstalment {
  instalment_id: string;
  expense_id: string;
  wedding_id: string;
  expense_name: string;
  amount: number;
  due_date: string;
  currency: string | null;
  owner_email: string | null;
  joint_email: string | null;
  partner_1_email: string | null;
  partner_2_email: string | null;
}

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(
      amount || 0
    );
  } catch {
    return `${currency} ${Math.round(amount || 0).toLocaleString()}`;
  }
}

function formatDueDate(dueDate: string) {
  return new Date(`${dueDate}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function sendReminderEmail(row: DueInstalment, recipients: string[]) {
  const amountLabel = formatCurrency(row.amount, row.currency ?? "USD");
  const dueLabel = formatDueDate(row.due_date);

  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: recipients,
      subject: `Payment due soon: ${row.expense_name}`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #2a2e28;">A payment is coming up 💍</h2>
          <p style="color: #2a2e28;">
            <strong>${row.expense_name}</strong> has ${amountLabel} due on <strong>${dueLabel}</strong>.
          </p>
          <p style="color: #6f7a6b; font-size: 13px;">
            Open Wedding Planner and mark it as paid once it's sent, so this reminder stops.
          </p>
        </div>
      `,
    }),
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY is not configured for this project." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: due, error } = await supabase.rpc("expense_instalments_due_for_reminder");
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const row of (due ?? []) as DueInstalment[]) {
    const recipients = Array.from(
      new Set(
        [row.owner_email, row.joint_email, row.partner_1_email, row.partner_2_email].filter(
          (e): e is string => !!e
        )
      )
    );

    // Push is a separate channel from email — sent to whichever full-access
    // members (owner/editor) have a linked app account and have turned this
    // category on, regardless of whether an email recipient was resolved
    // above (push needs an actual user_id, not an address). Best-effort:
    // never lets a push failure affect the email sent/skipped/failures
    // tracking below, which stays the source of truth for
    // last_reminder_sent_at.
    const { data: members } = await supabase
      .from("wedding_members")
      .select("user_id, role")
      .eq("wedding_id", row.wedding_id)
      .in("role", ["owner", "editor"]);
    await Promise.all(
      (members ?? [])
        .filter((m: { user_id: string | null }) => m.user_id)
        .map((m: { user_id: string }) =>
          sendPushToUser(supabase, m.user_id, row.wedding_id, "payment_due", {
            title: "Payment due soon",
            body: `${row.expense_name}: ${formatCurrency(row.amount, row.currency ?? "USD")} due ${formatDueDate(row.due_date)}`,
            url: "/budget",
          }).catch(() => {})
        )
    );

    if (recipients.length === 0) {
      skipped += 1;
      continue;
    }

    try {
      const res = await sendReminderEmail(row, recipients);
      if (res.ok) {
        sent += 1;
        await supabase
          .from("expense_instalments")
          .update({ last_reminder_sent_at: new Date().toISOString() })
          .eq("id", row.instalment_id);
      } else {
        const body = await res.json().catch(() => null);
        failures.push(`${row.instalment_id}: ${body?.message ?? res.statusText}`);
      }
    } catch (err) {
      failures.push(`${row.instalment_id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, checked: due?.length ?? 0, sent, skipped, failures }),
    { headers: { "Content-Type": "application/json" } }
  );
});
