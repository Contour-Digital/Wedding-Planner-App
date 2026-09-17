"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "./useRealtimeTable";
import type { InspirationPhoto } from "@/lib/types/database";

export function useInspirationPhotos(weddingId: string | null | undefined) {
  const [photos, setPhotos] = useState<InspirationPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!weddingId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("inspiration_photos")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: false });
    setPhotos(data ?? []);
    setLoading(false);
  }, [weddingId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeTable("inspiration_photos", weddingId, load);

  return { photos, loading, refresh: load };
}
