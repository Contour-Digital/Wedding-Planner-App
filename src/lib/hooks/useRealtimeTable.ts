"use client";

import { useEffect, useId } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to Postgres changes for a table filtered to one wedding, and
 * calls `onChange` whenever a row is inserted/updated/deleted. Used to keep
 * Tasks, Timeline, Expenses and Vendors live across everyone viewing the
 * same wedding (e.g. Partner 2 sees Partner 1's speech-time edit instantly).
 */
export function useRealtimeTable(table: string, weddingId: string | null | undefined, onChange: () => void) {
  // The browser Supabase client is a singleton (createBrowserClient caches
  // it), and its realtime client dedupes channel() calls by topic string —
  // a second call with the same topic hands back the first caller's already-
  // subscribed channel instead of a new one, and .on() throws on that
  // ("cannot add postgres_changes callbacks ... after subscribe()"). This
  // hook is called from more than one simultaneously-mounted component for
  // the same table+wedding (e.g. useMembers, called from both TaskModal and
  // every TaskRow), so the topic needs a per-instance suffix to stay unique
  // — useId() gives each mounted call site its own, stable for its lifetime.
  const instanceId = useId();

  useEffect(() => {
    if (!weddingId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`${table}:${weddingId}:${instanceId}`)
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
  }, [table, weddingId, instanceId]);
}
