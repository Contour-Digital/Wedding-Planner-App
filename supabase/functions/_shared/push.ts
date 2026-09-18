// Shared Web Push sending for scheduled Edge Functions (payment-reminders,
// task-reminders) — same VAPID keys and per-category preference check as
// src/lib/server/push.ts on the Next.js side, reimplemented here since Edge
// Functions run on Deno and can't import Next.js server code directly.
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT_EMAIL = Deno.env.get("VAPID_SUBJECT_EMAIL") || "support@example.com";

let configured = false;
function ensureVapid() {
  if (configured) return true;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(`mailto:${VAPID_SUBJECT_EMAIL}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

export type NotificationCategory = "payment_due" | "task_assigned" | "task_due" | "member_joined";

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

// deno-lint-ignore no-explicit-any
export async function sendPushToUser(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
  weddingId: string,
  category: NotificationCategory,
  payload: { title: string; body: string; url?: string }
) {
  if (!ensureVapid()) return;

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select(category)
    .eq("user_id", userId)
    .eq("wedding_id", weddingId)
    .maybeSingle();
  if (prefs && prefs[category] === false) return;

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth_key")
    .eq("user_id", userId);
  if (!subscriptions || subscriptions.length === 0) return;

  await Promise.all(
    (subscriptions as PushSubscriptionRow[]).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          JSON.stringify(payload)
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    })
  );
}
