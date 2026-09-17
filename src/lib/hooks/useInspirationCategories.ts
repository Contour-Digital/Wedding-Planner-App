"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { InspirationCategory } from "@/lib/types/database";

// Seeded the first time a wedding ever opens Inspiration, the same way
// onboarding seeds expense categories — but this can't hook into the
// create_wedding_for_current_user() RPC (that SQL isn't checked into this
// repo), so it's seeded lazily here instead, on first load.
const DEFAULT_CATEGORIES = ["Ceremony", "Cocktail Hour", "Reception", "Wedding Party"];

export function useInspirationCategories(weddingId: string | null | undefined) {
  const [categories, setCategories] = useState<InspirationCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!weddingId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("inspiration_categories")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("sort_order", { ascending: true });

    if ((data?.length ?? 0) === 0) {
      // unique(wedding_id, name) + ignoreDuplicates makes this safe even if
      // two tabs both hit this on the very first load at once.
      await supabase.from("inspiration_categories").upsert(
        DEFAULT_CATEGORIES.map((name, i) => ({ wedding_id: weddingId, name, sort_order: i })),
        { onConflict: "wedding_id,name", ignoreDuplicates: true }
      );
      const { data: seeded } = await supabase
        .from("inspiration_categories")
        .select("*")
        .eq("wedding_id", weddingId)
        .order("sort_order", { ascending: true });
      setCategories(seeded ?? []);
    } else {
      setCategories(data ?? []);
    }
    setLoading(false);
  }, [weddingId]);

  useEffect(() => {
    load();
  }, [load]);

  return { categories, loading, refresh: load };
}
