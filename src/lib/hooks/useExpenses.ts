"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "./useRealtimeTable";
import type { ExpenseWithInstalments } from "@/lib/types/domain";

export function useExpenses(weddingId: string | null | undefined) {
  const [expenses, setExpenses] = useState<ExpenseWithInstalments[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!weddingId) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("expenses")
      .select("*, instalments:expense_instalments(*)")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setExpenses(
        data.map((row: any) => ({
          ...row,
          instalments: (row.instalments ?? []).sort(
            (a: any, b: any) => (a.due_date ?? "").localeCompare(b.due_date ?? "")
          ),
        }))
      );
    }
    setLoading(false);
  }, [weddingId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeTable("expenses", weddingId, load);
  useRealtimeTable("expense_instalments", weddingId, load);

  return { expenses, loading, refresh: load };
}
