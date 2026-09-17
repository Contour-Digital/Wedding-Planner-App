"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "./useRealtimeTable";
import type { Task } from "@/lib/types/database";

export function useTasks(weddingId: string | null | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!weddingId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("due_date", { ascending: true, nullsFirst: false });
    setTasks(data ?? []);
    setLoading(false);
  }, [weddingId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeTable("tasks", weddingId, load);

  return { tasks, loading, refresh: load };
}
