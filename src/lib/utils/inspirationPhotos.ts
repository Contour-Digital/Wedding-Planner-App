import { createClient } from "@/lib/supabase/client";

export const INSPIRATION_BUCKET = "inspiration-photos";

// The bucket is public (see supabase/migrations/0006_inspiration.sql), so
// this is a synchronous URL, not a signed-URL round trip — needed for a
// masonry gallery that renders many photos at once.
export function inspirationPhotoUrl(storagePath: string) {
  return createClient().storage.from(INSPIRATION_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}
