import type { SupabaseClient } from "@supabase/supabase-js";

interface LogActivityInput {
  weddingId: string;
  userId: string;
  actionType: string;
  description: string;
  entityType?: string;
  entityId?: string;
}

// Fire-and-forget activity log write. Called after every meaningful mutation
// (task completed, payment marked paid, vendor status changed, etc) so the
// Activity page stays an honest record of who-did-what.
export async function logActivity(supabase: SupabaseClient, input: LogActivityInput) {
  const { error } = await supabase.from("activity_log").insert({
    wedding_id: input.weddingId,
    user_id: input.userId,
    action_type: input.actionType,
    description: input.description,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
  });

  if (error) {
    // Never let a logging failure block the actual user-facing action.
    console.error("Failed to record activity", error);
  }
}
