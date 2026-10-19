"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "./useRealtimeTable";
import type { ExpenseQuote } from "@/lib/types/database";

export function useQuotes(weddingId: string | null | undefined) {
  const [quotes, setQuotes] = useState<ExpenseQuote[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!weddingId) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("expense_quotes")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: true });

    if (!error && data) setQuotes(data as ExpenseQuote[]);
    setLoading(false);
  }, [weddingId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeTable("expense_quotes", weddingId, load);

  return { quotes, loading, refresh: load };
}
