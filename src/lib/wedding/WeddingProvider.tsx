"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Wedding, WeddingRole } from "@/lib/types/database";

interface WeddingContextValue {
  user: User | null;
  wedding: Wedding | null;
  role: WeddingRole | null;
  loading: boolean;
  weddingIds: string[];
  refresh: () => Promise<void>;
  setActiveWeddingId: (id: string) => void;
}

const WeddingContext = createContext<WeddingContextValue | undefined>(undefined);

const ACTIVE_WEDDING_KEY = "wedding-planner:active-wedding-id";

export function WeddingProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [role, setRole] = useState<WeddingRole | null>(null);
  const [weddingIds, setWeddingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    setUser(currentUser);

    if (!currentUser) {
      setWedding(null);
      setRole(null);
      setWeddingIds([]);
      setLoading(false);
      return;
    }

    // Ordered explicitly — without it, Postgres doesn't guarantee row order,
    // so ids[0] below (the fallback "active wedding" whenever localStorage
    // has no saved choice, e.g. a different browser/device or a cleared
    // cache) wouldn't be stable for anyone belonging to more than one
    // wedding. Oldest-first makes it deterministic and matches the most
    // likely "main" wedding for someone who's ended up in several.
    const { data: memberships } = await supabase
      .from("wedding_members")
      .select("wedding_id, role")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: true });

    const ids = (memberships ?? []).map((m) => m.wedding_id);
    setWeddingIds(ids);

    if (ids.length === 0) {
      setWedding(null);
      setRole(null);
      setLoading(false);
      return;
    }

    let activeId =
      typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_WEDDING_KEY) : null;
    if (!activeId || !ids.includes(activeId)) {
      activeId = ids[0];
    }

    const { data: weddingRow } = await supabase
      .from("weddings")
      .select("*")
      .eq("id", activeId)
      .single();

    setWedding(weddingRow ?? null);
    setRole(memberships?.find((m) => m.wedding_id === activeId)?.role as WeddingRole);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => load());
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setActiveWeddingId = useCallback(
    (id: string) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ACTIVE_WEDDING_KEY, id);
      }
      load();
    },
    [load]
  );

  return (
    <WeddingContext.Provider
      value={{ user, wedding, role, loading, weddingIds, refresh: load, setActiveWeddingId }}
    >
      {children}
    </WeddingContext.Provider>
  );
}

export function useWedding() {
  const ctx = useContext(WeddingContext);
  if (!ctx) throw new Error("useWedding must be used within a WeddingProvider");
  return ctx;
}
