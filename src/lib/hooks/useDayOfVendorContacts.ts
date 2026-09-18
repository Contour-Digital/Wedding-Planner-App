"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DayOfVendorContact } from "@/lib/types/database";

// No realtime subscription here — day_of_vendor_contacts is a view over
// vendor_contacts, which has no wedding_id column of its own for
// useRealtimeTable's postgres_changes filter to key off. The Vendors page
// already calls refresh() after toggling the checkbox, which is enough to
// keep this in sync for the person actually flipping it.
export function useDayOfVendorContacts(weddingId: string | null | undefined) {
  const [contacts, setContacts] = useState<DayOfVendorContact[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!weddingId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("day_of_vendor_contacts")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("vendor_name", { ascending: true });
    setContacts(data ?? []);
    setLoading(false);
  }, [weddingId]);

  useEffect(() => {
    load();
  }, [load]);

  return { contacts, loading, refresh: load };
}
