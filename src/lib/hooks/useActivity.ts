"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "./useRealtimeTable";
import type { ActivityLogEntry } from "@/lib/types/database";

export function useActivity(weddingId: string | null | undefined, limit = 100) {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!weddingId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("activity_log")
      .select("*, profile:profiles(*)")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: false })
      .limit(limit);
    setEntries((data as ActivityLogEntry[]) ?? []);
    setLoading(false);
  }, [weddingId, limit]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeTable("activity_log", weddingId, load);

  return { entries, loading, refresh: load };
}
