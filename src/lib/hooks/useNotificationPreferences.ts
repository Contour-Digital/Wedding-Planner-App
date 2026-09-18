"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type PreferenceKey = "payment_due" | "task_assigned" | "task_due" | "member_joined";

const DEFAULTS: Record<PreferenceKey, boolean> = {
  payment_due: true,
  task_assigned: true,
  task_due: true,
  member_joined: true,
};

// No saved row yet means every category defaults to on, matching the
// notification_preferences column defaults (migration 0020) — that row is
// only created the first time someone actually flips a toggle.
export function useNotificationPreferences(userId: string | null | undefined, weddingId: string | null | undefined) {
  const [preferences, setPreferences] = useState<Record<PreferenceKey, boolean>>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId || !weddingId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("notification_preferences")
      .select("payment_due, task_assigned, task_due, member_joined")
      .eq("user_id", userId)
      .eq("wedding_id", weddingId)
      .maybeSingle();
    setPreferences(data ?? DEFAULTS);
    setLoading(false);
  }, [userId, weddingId]);

  useEffect(() => {
    load();
  }, [load]);

  async function setPreference(key: PreferenceKey, value: boolean) {
    if (!userId || !weddingId) return;
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    const supabase = createClient();
    await supabase
      .from("notification_preferences")
      .upsert({ user_id: userId, wedding_id: weddingId, ...next }, { onConflict: "user_id,wedding_id" });
  }

  return { preferences, loading, setPreference };
}
