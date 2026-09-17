"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "./useRealtimeTable";
import type { WeddingMember } from "@/lib/types/database";

export function useMembers(weddingId: string | null | undefined) {
  const [members, setMembers] = useState<WeddingMember[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!weddingId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("wedding_members")
      .select("*, profile:profiles(*)")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: true });
    setMembers((data as WeddingMember[]) ?? []);
    setLoading(false);
  }, [weddingId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeTable("wedding_members", weddingId, load);

  return { members, loading, refresh: load };
}
