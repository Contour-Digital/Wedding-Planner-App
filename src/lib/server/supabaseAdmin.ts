import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

// Same service_role client pattern used by /api/invite and
// /api/invite-link/[id] — reads/writes that cross users (another member's
// push subscriptions, another wedding's data) need to bypass RLS
// deliberately rather than rely on the caller's own access.
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) return null;
  return createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
