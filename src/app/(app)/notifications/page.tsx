"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/nav/PageHeader";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useNotificationPreferences, type PreferenceKey } from "@/lib/hooks/useNotificationPreferences";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { pushSupported, getPushSubscription, subscribeToPush, unsubscribeFromPush } from "@/lib/push/subscribe";
import { canSeeFinancials, canSeeVendorsAndTasks } from "@/lib/utils/permissions";
import type { WeddingRole } from "@/lib/types/database";

// Only shown to a role that could ever actually receive the category —
// e.g. payment_due only ever goes to owner/editor (see
// payment-reminders' recipient query), and member_joined only ever goes to
// the wedding owner (see /api/notify/member-joined) — so anyone else's
// toggle would just be dead UI.
const CATEGORIES: { key: PreferenceKey; label: string; hint: string; relevantTo: (role: WeddingRole | null | undefined) => boolean }[] = [
  {
    key: "payment_due",
    label: "Payment due reminders",
    hint: "When a bill or instalment is coming up",
    relevantTo: canSeeFinancials,
  },
  {
    key: "task_assigned",
    label: "Task assigned to me",
    hint: "When someone assigns you a task",
    relevantTo: canSeeVendorsAndTasks,
  },
  {
    key: "task_due",
    label: "Task due soon",
    hint: "When one of your tasks is due or overdue",
    relevantTo: canSeeVendorsAndTasks,
  },
  {
    key: "member_joined",
    label: "New member joins",
    hint: "When someone you invited accepts and signs in",
    relevantTo: (role) => role === "owner",
  },
];

export default function NotificationsPage() {
  const { user, wedding, role } = useWedding();
  const { preferences, setPreference } = useNotificationPreferences(user?.id, wedding?.id);
  const categories = CATEGORIES.filter((c) => c.relevantTo(role));

  const [supported, setSupported] = useState(true);
  const [denied, setDenied] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pushSupported()) {
      setSupported(false);
      return;
    }
    setDenied(Notification.permission === "denied");
    getPushSubscription().then((sub) => setSubscribed(!!sub));
  }, []);

  async function handleEnable() {
    setBusy(true);
    setError(null);
    const result = await subscribeToPush();
    if (!result.ok) {
      setError(result.error ?? "Couldn't enable notifications.");
      setDenied(Notification.permission === "denied");
    } else {
      setSubscribed(true);
    }
    setBusy(false);
  }

  async function handleDisable() {
    setBusy(true);
    await unsubscribeFromPush();
    setSubscribed(false);
    setBusy(false);
  }

  return (
    <div>
      <PageHeader title="Notifications" />
      <div className="space-y-6 p-4 sm:p-6">
        <Card className="space-y-3">
          <h3 className="font-display text-lg font-semibold">Push notifications</h3>
          {!supported && (
            <p className="text-sm text-muted">
              Push notifications aren&apos;t supported in this browser. On iPhone, add this app to your Home
              Screen first (Share → Add to Home Screen), then open it from there and try again.
            </p>
          )}
          {supported && denied && (
            <p className="text-sm text-muted">
              Notifications are blocked for this site in your browser settings — enable them there, then come
              back to this page.
            </p>
          )}
          {supported && !denied && (
            <>
              <p className="text-sm text-muted">
                {subscribed
                  ? "Notifications are on for this device."
                  : "Turn on notifications for this device to get the alerts below."}
              </p>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button
                variant={subscribed ? "secondary" : "primary"}
                onClick={subscribed ? handleDisable : handleEnable}
                loading={busy}
              >
                {subscribed ? "Turn off on this device" : "Enable notifications"}
              </Button>
            </>
          )}
        </Card>

        <Card className="space-y-4">
          <div>
            <h3 className="font-display text-lg font-semibold">What to notify me about</h3>
            <p className="mt-1 text-xs text-muted">Applies whenever notifications are on for a device.</p>
          </div>
          {categories.length === 0 ? (
            <p className="text-sm text-muted">No notification types apply to your role yet.</p>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => (
                <label key={category.key} className="flex items-center justify-between gap-4">
                  <span>
                    <span className="block text-sm font-medium">{category.label}</span>
                    <span className="block text-xs text-muted">{category.hint}</span>
                  </span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0"
                    checked={preferences[category.key]}
                    onChange={(e) => setPreference(category.key, e.target.checked)}
                  />
                </label>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
