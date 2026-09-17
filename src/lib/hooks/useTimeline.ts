"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "./useRealtimeTable";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import type { TimelineEvent, TimelineEventShared } from "@/lib/types/database";

// Reads from the full table (with private_notes) for owner/editor, and from
// the private-notes-free view for everyone else. The database enforces this
// distinction independently via RLS + the view definition — this hook just
// picks the right source.
export function useTimeline(weddingId: string | null | undefined) {
  const { role } = useWedding();
  const [events, setEvents] = useState<(TimelineEvent | TimelineEventShared)[]>([]);
  const [loading, setLoading] = useState(true);

  const canSeePrivate = role === "owner" || role === "editor";

  const load = useCallback(async () => {
    if (!weddingId) return;
    const supabase = createClient();
    const table = canSeePrivate ? "timeline_events" : "timeline_events_shared";
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("wedding_id", weddingId)
      .order("sort_order", { ascending: true });
    if (!error && data) setEvents(data);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weddingId, canSeePrivate]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeTable("timeline_events", weddingId, load);

  return { events, loading, refresh: load, canSeePrivate };
}
