"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NoteCategory } from "@/lib/types/database";

export function useNoteCategories(weddingId: string | null | undefined) {
  const [categories, setCategories] = useState<NoteCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!weddingId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("note_categories")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("sort_order", { ascending: true });
    setCategories(data ?? []);
    setLoading(false);
  }, [weddingId]);

  useEffect(() => {
    load();
  }, [load]);

  return { categories, loading, refresh: load };
}
