import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/server/supabaseAdmin";
import { sendPushToUser } from "@/lib/server/push";

// Fired (fire-and-forget) from the invite page right after a first-ever
// sign-in — see the accountReady branch in src/app/invite/[id]/page.tsx.
// A later visit takes the "already accepted" branch instead (once
// last_sign_in_at is set), so this only ever fires once per invite in
// practice; no separate dedupe needed here.
//
// Uses the admin client throughout, same as /api/invite — the person who
// just signed in may not have settled into a full session yet, and the
// recipient (the owner) is someone else entirely, which is exactly the
// "reads across users" case that route's own RLS can't be trusted for.
export async function POST(request: Request) {
  let body: { memberId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.memberId) {
    return NextResponse.json({ error: "Missing member." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    // Not configured — same as elsewhere, this is best-effort and never
    // something the invite flow itself should fail over.
    return NextResponse.json({ ok: true });
  }

  const { data: member } = await admin
    .from("wedding_members")
    .select("wedding_id, invited_name, invited_email")
    .eq("id", body.memberId)
    .maybeSingle();
  if (!member) {
    return NextResponse.json({ ok: true });
  }

  const { data: owner } = await admin
    .from("wedding_members")
    .select("user_id")
    .eq("wedding_id", member.wedding_id)
    .eq("role", "owner")
    .maybeSingle();
  if (!owner?.user_id) {
    return NextResponse.json({ ok: true });
  }

  const name = member.invited_name || member.invited_email || "Someone";
  await sendPushToUser(owner.user_id, member.wedding_id, "member_joined", {
    title: "New member joined",
    body: `${name} just joined your wedding.`,
    url: "/sharing",
  });

  return NextResponse.json({ ok: true });
}
