"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "./useRealtimeTable";
import type { Vendor, VendorContact, VendorDocument } from "@/lib/types/database";

export interface VendorWithRelations extends Vendor {
  contacts: VendorContact[];
  documents: VendorDocument[];
}

export function useVendors(weddingId: string | null | undefined) {
  const [vendors, setVendors] = useState<VendorWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!weddingId) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("vendors")
      .select("*, contacts:vendor_contacts(*), documents:vendor_documents(*)")
      .eq("wedding_id", weddingId)
      .order("name", { ascending: true });
    if (!error && data) setVendors(data as VendorWithRelations[]);
    setLoading(false);
  }, [weddingId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeTable("vendors", weddingId, load);

  return { vendors, loading, refresh: load };
}
