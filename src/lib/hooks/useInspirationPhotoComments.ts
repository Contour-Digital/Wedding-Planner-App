"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { InspirationPhotoComment } from "@/lib/types/database";

export function useInspirationPhotoComments(photoId: string | null | undefined) {
  const [comments, setComments] = useState<InspirationPhotoComment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!photoId) {
      setComments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("inspiration_photo_comments")
      .select("*")
      .eq("photo_id", photoId)
      .order("created_at", { ascending: true });
    setComments(data ?? []);
    setLoading(false);
  }, [photoId]);

  useEffect(() => {
    load();
  }, [load]);

  return { comments, loading, refresh: load };
}
