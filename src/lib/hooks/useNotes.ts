"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "./useRealtimeTable";
import type { Note } from "@/lib/types/database";

export function useNotes(weddingId: string | null | undefined) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!weddingId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("updated_at", { ascending: false });
    setNotes(data ?? []);
    setLoading(false);
  }, [weddingId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeTable("notes", weddingId, load);

  return { notes, loading, refresh: load };
}
