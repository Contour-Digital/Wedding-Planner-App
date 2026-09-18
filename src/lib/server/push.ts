import webpush from "web-push";
import { createAdminClient } from "./supabaseAdmin";

export type NotificationCategory = "payment_due" | "task_assigned" | "task_due" | "member_joined";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_SUBJECT_EMAIL ?? "support@example.com"}`,
    publicKey,
    privateKey
  );
  vapidConfigured = true;
  return true;
}

// Sends a push to every subscription (browser/device) a user has enabled,
// honouring their Notifications tab preference for this category first —
// silently does nothing if push isn't configured (no VAPID keys yet), the
// category is off, or they have no subscriptions, since none of those are
// error conditions worth surfacing to whoever triggered the underlying
// action (e.g. assigning a task shouldn't fail just because the assignee
// never turned notifications on).
export async function sendPushToUser(
  userId: string,
  weddingId: string,
  category: NotificationCategory,
  payload: PushPayload
) {
  if (!ensureVapid()) return;
  const admin = createAdminClient();
  if (!admin) return;

  const { data: prefs } = await admin
    .from("notification_preferences")
    .select(category)
    .eq("user_id", userId)
    .eq("wedding_id", weddingId)
    .maybeSingle();
  // No saved row yet means every category defaults to on (migration 0020's
  // column defaults) — only an explicit false should suppress this.
  if (prefs && (prefs as Record<string, boolean>)[category] === false) return;

  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth_key")
    .eq("user_id", userId);
  if (!subscriptions || subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          JSON.stringify(payload)
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        // 404/410 mean the browser dropped this subscription (uninstalled,
        // cleared site data, expired) — nothing will ever succeed against
        // it again, so it's cleaned up rather than retried forever.
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    })
  );
}
