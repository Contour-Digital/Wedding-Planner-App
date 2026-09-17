"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to Postgres changes for a table filtered to one wedding, and
 * calls `onChange` whenever a row is inserted/updated/deleted. Used to keep
 * Tasks, Timeline, Expenses and Vendors live across everyone viewing the
 * same wedding (e.g. Partner 2 sees Partner 1's speech-time edit instantly).
 */
export function useRealtimeTable(table: string, weddingId: string | null | undefined, onChange: () => void) {
  useEffect(() => {
    if (!weddingId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`realtime:${table}:${weddingId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `wedding_id=eq.${weddingId}` },
        () => onChange()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, weddingId]);
}
