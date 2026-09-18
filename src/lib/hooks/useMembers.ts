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
    // wedding_members_with_status (migration 0013) instead of the base
    // table — adds invited_name and confirmed (whether they've actually
    // clicked their invite link, not just whether a user_id exists yet),
    // while keeping the same profile:{...} shape the base table's
    // profile:profiles(*) embed had, so nothing else needs to change.
    const { data } = await supabase
      .from("wedding_members_with_status")
      .select("*")
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
