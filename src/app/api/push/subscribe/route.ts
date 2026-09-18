import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

// Self-service only — saves the caller's own subscription, using the
// normal RLS-scoped client (push_subscriptions: manage own, migration
// 0020), not the admin client. Upserts on endpoint so re-subscribing the
// same browser (e.g. after a permission reset) replaces the old keys
// instead of erroring on the unique constraint.
export async function POST(request: Request) {
  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const endpoint = body.endpoint;
  const p256dh = body.keys?.p256dh;
  const authKey = body.keys?.auth;
  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: "Missing subscription details." }, { status: 400 });
  }

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ user_id: user.id, endpoint, p256dh, auth_key: authKey }, { onConflict: "endpoint" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
