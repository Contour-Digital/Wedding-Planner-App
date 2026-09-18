import { NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

// Creates (or updates) a pending wedding_members row for the invitee and
// hands back a shareable link — /invite/{memberRowId} — instead of sending
// an email. Email delivery (Supabase's own mailer and, before that, Resend)
// turned out to be unreliable enough in practice that invitees were never
// getting anything, so invites are now handed over out-of-band (text,
// WhatsApp, however the couple wants) and claimed by whoever opens the
// link — see /api/invite-link/[id] for the claim side.
//
// Requires a SUPABASE_SERVICE_ROLE_KEY env var (Supabase dashboard → Project
// Settings → API → service_role secret) — server-only, no NEXT_PUBLIC_
// prefix — since reading/writing wedding_members for someone else needs it.
//
// Rate limited per wedding (see invite_requests below) — a sane cap on how
// many invite links one wedding can generate per hour.
const INVITE_RATE_LIMIT = 20;

export async function POST(request: Request) {
  let body: { weddingId?: string; email?: string; role?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { weddingId, role } = body;
  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim() || null;

  if (!weddingId || !email || !role) {
    return NextResponse.json({ error: "Missing wedding, email, or role." }, { status: 400 });
  }
  if (!["editor", "viewer", "timeline_viewer"].includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  // Identify the caller from their session cookie, then confirm — server
  // side, not trusting the client — that they actually own this wedding.
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("wedding_members")
    .select("role")
    .eq("wedding_id", weddingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "owner") {
    return NextResponse.json({ error: "Only the wedding owner can invite people." }, { status: 403 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      {
        error:
          "Invites aren't configured yet — add a SUPABASE_SERVICE_ROLE_KEY environment variable (Supabase dashboard → Project Settings → API) and redeploy.",
      },
      { status: 500 }
    );
  }

  const admin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Rate limit: at most INVITE_RATE_LIMIT invite requests per wedding per
  // rolling hour, counted from invite_requests rather than in-memory state
  // (this route runs on stateless serverless functions, so in-memory state
  // wouldn't be shared across instances or survive a cold start).
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentInviteCount } = await admin
    .from("invite_requests")
    .select("id", { count: "exact", head: true })
    .eq("wedding_id", weddingId)
    .gte("created_at", oneHourAgo);

  if ((recentInviteCount ?? 0) >= INVITE_RATE_LIMIT) {
    return NextResponse.json(
      { error: "Too many invites created for this wedding recently. Please try again in a bit." },
      { status: 429 }
    );
  }

  await admin.from("invite_requests").insert({ wedding_id: weddingId, requested_by: user.id });

  // If this email already has an account, grant access immediately — no
  // point making an existing user click a link and re-authenticate just to
  // get a role they can already be given directly.
  const { data: existingProfile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  const invitedUserId = existingProfile?.id ?? null;

  // Update an existing row for this person on this wedding if one already
  // exists (e.g. a prior pending invite, or changing their role), otherwise
  // insert a new one. Two separate .eq() branches rather than a single
  // .or() filter string — PostgREST's .or() syntax uses "column.op.value"
  // with dots as separators, and email addresses always contain dots,
  // which would corrupt that filter string.
  const memberLookup = admin.from("wedding_members").select("id").eq("wedding_id", weddingId);
  const { data: existingMember } = invitedUserId
    ? await memberLookup.eq("user_id", invitedUserId).maybeSingle()
    : await memberLookup.eq("invited_email", email).maybeSingle();

  // invited_email always stays set to the target address, even once
  // user_id is also known — it's the permanent record of who this invite
  // belongs to, and what the invite link's claim step checks the signing-in
  // email against.
  const memberPayload: {
    wedding_id: string;
    user_id: string | null;
    invited_email: string;
    role: string;
    invited_name?: string;
  } = { wedding_id: weddingId, user_id: invitedUserId, invited_email: email, role };

  // Only set when actually provided — e.g. re-creating a link for someone
  // that doesn't re-ask for a name shouldn't clobber the name already on
  // file for them.
  if (name) {
    memberPayload.invited_name = name;
  }

  let memberId: string;
  if (existingMember) {
    const { error: dbError } = await admin.from("wedding_members").update(memberPayload).eq("id", existingMember.id);
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 });
    memberId = existingMember.id;
  } else {
    const { data: inserted, error: dbError } = await admin
      .from("wedding_members")
      .insert(memberPayload)
      .select("id")
      .single();
    if (dbError || !inserted) {
      return NextResponse.json({ error: dbError?.message ?? "Couldn't create that invite." }, { status: 400 });
    }
    memberId = inserted.id;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const inviteLink = `${siteUrl}/invite/${memberId}`;

  return NextResponse.json({ ok: true, inviteLink, alreadyHasAccess: invitedUserId !== null });
}
