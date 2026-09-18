import { NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

// Actually sends an invite email, instead of only writing a "pending" row
// and hoping the couple tells their invitee to sign up with that exact
// email. Runs server-side because sending an admin invite and reading/
// writing wedding_members for someone else both require the Supabase
// SERVICE ROLE key, which must never reach the browser.
//
// Two sending paths:
//  - RESEND_API_KEY set: generate an invite link via Supabase (without
//    letting Supabase send its own email), then send our own email through
//    Resend with Reply-To set to the couple's joint_email (falling back to
//    the inviting owner's own account email) — so replies land with the
//    couple, not the app. This is what lets a couple's joint inbox receive
//    invite replies without ever needing to control the *From* address
//    (which mailbox providers won't allow for arbitrary third-party senders
//    anyway — Reply-To is the standard, deliverable way to do this).
//  - RESEND_API_KEY not set: fall back to Supabase Auth's own built-in
//    invite email (no custom Reply-To, but works out of the box).
//
// Requires a SUPABASE_SERVICE_ROLE_KEY env var (Supabase dashboard → Project
// Settings → API → service_role secret) — server-only, no NEXT_PUBLIC_
// prefix. Without it, this route fails clearly rather than silently.
//
// Also rate limited per wedding (see invite_requests below) — a sane cap
// on how many invites one wedding can send per hour, regardless of who's
// calling this route or how.
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

  const { data: wedding } = await supabase
    .from("weddings")
    .select("partner_1, partner_2, joint_email")
    .eq("id", weddingId)
    .maybeSingle();

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      {
        error:
          "Email invites aren't configured yet — add a SUPABASE_SERVICE_ROLE_KEY environment variable (Supabase dashboard → Project Settings → API) and redeploy.",
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
  // wouldn't be shared across instances or survive a cold start). Logged
  // before any Resend/admin work runs, so a retried failure still counts.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentInviteCount } = await admin
    .from("invite_requests")
    .select("id", { count: "exact", head: true })
    .eq("wedding_id", weddingId)
    .gte("created_at", oneHourAgo);

  if ((recentInviteCount ?? 0) >= INVITE_RATE_LIMIT) {
    return NextResponse.json(
      { error: "Too many invites sent for this wedding recently. Please try again in a bit." },
      { status: 429 }
    );
  }

  await admin.from("invite_requests").insert({ wedding_id: weddingId, requested_by: user.id });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const redirectTo = `${siteUrl}/onboarding`;
  const resendApiKey = process.env.RESEND_API_KEY;
  const inviterLabel =
    wedding?.partner_1 && wedding?.partner_2 ? `${wedding.partner_1} & ${wedding.partner_2}` : "the couple";
  const replyTo = wedding?.joint_email || user.email || undefined;

  // Sends our own branded email (with a custom Reply-To) through Resend for
  // whichever Supabase action link generated it — "invite" for a brand-new
  // signup, "magiclink" for the resend-to-an-existing-unconfirmed-user case
  // below. Either way it's the same email to the invitee.
  async function sendActionLinkViaResend(actionLink: string): Promise<{ ok: boolean; error: string | null }> {
    const fromAddress = process.env.RESEND_FROM_EMAIL || "Wedding Planner <onboarding@resend.dev>";
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromAddress,
        to: email,
        reply_to: replyTo,
        subject: `You're invited to help plan ${inviterLabel}'s wedding`,
        html: `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #2a2e28;">You're invited! 💍</h2>
            <p style="color: #2a2e28;">${inviterLabel} has invited you to help plan their wedding.</p>
            <p>
              <a href="${actionLink}"
                 style="display: inline-block; background: #9caf98; color: #2a2e28; padding: 12px 20px;
                        border-radius: 10px; text-decoration: none; font-weight: 600;">
                Accept invite
              </a>
            </p>
            <p style="color: #6f7a6b; font-size: 13px;">This link will sign you in and get you set up.</p>
          </div>
        `,
      }),
    });

    if (resendRes.ok) return { ok: true, error: null };
    const resendError = await resendRes.json().catch(() => null);
    return { ok: false, error: resendError?.message ?? "Resend couldn't send the invite email." };
  }

  let invitedUserId: string | null = null;
  let emailSent = false;
  let firstError: string | null = null;

  if (resendApiKey) {
    // Ask Supabase to create the account and hand us a magic sign-in link,
    // but suppress its own email — we're sending our own via Resend so we
    // can set a custom Reply-To.
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo },
    });
    invitedUserId = linkData?.user?.id ?? null;
    firstError = linkError?.message ?? null;

    if (invitedUserId && linkData?.properties?.action_link) {
      const sent = await sendActionLinkViaResend(linkData.properties.action_link);
      emailSent = sent.ok;
      if (!sent.ok) firstError = sent.error;
    }
  } else {
    // No Resend key configured yet — fall back to Supabase's own built-in
    // invite email (no custom Reply-To, but works with zero extra setup).
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    invitedUserId = invited?.user?.id ?? null;
    emailSent = !inviteError;
    firstError = inviteError?.message ?? null;
  }

  if (!invitedUserId) {
    // generateLink/inviteUserByEmail with type "invite" only succeeds for a
    // brand-new email — an invite already creates the auth.users row the
    // instant it's sent (before the invitee ever clicks anything), so it
    // errors identically here whether this address belongs to a fully
    // active member (nothing to send, they can just sign in) or someone who
    // was invited before but never finished signing up (they need a fresh
    // link — the old one may have expired or been lost). Telling those two
    // cases apart is the point of what follows: silently reporting success
    // with no email sent is only correct for the first one, and was
    // swallowing every "Resend invite" click for someone stuck in the
    // second.
    const { data: existingProfile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();

    if (!existingProfile?.id) {
      return NextResponse.json({ error: firstError ?? "Couldn't send that invite." }, { status: 400 });
    }

    invitedUserId = existingProfile.id;

    const { data: existingUserData } = await admin.auth.admin.getUserById(existingProfile.id);
    const alreadyConfirmed = existingUserData?.user?.email_confirmed_at != null;

    if (alreadyConfirmed) {
      // Genuinely already active — they can just sign in, no email needed.
      emailSent = false;
    } else {
      // Stuck invite — give them a fresh working link. A magic link works
      // for any existing user regardless of confirmation state, and
      // clicking it both signs them in AND confirms their email as a side
      // effect of proving mailbox ownership — functionally equivalent to
      // finishing the original invite.
      if (resendApiKey) {
        const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo },
        });
        firstError = linkError?.message ?? firstError;

        if (linkData?.properties?.action_link) {
          const sent = await sendActionLinkViaResend(linkData.properties.action_link);
          emailSent = sent.ok;
          if (!sent.ok) firstError = sent.error;
        }
      } else {
        // No Resend key: use Supabase's own mailer to send the magic link
        // directly. shouldCreateUser: false — this email already has an
        // account, this only ever signs them into it, never creates a
        // duplicate.
        const { error: otpError } = await admin.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
        });
        emailSent = !otpError;
        firstError = otpError?.message ?? firstError;
      }

      if (!emailSent) {
        return NextResponse.json(
          { error: firstError ?? "Couldn't resend that invite. Please try again." },
          { status: 400 }
        );
      }
    }
  }

  // Grant access: update an existing row for this person on this wedding if
  // one already exists (e.g. a prior pending invite, or changing their
  // role), otherwise insert a new one. Two separate .eq() branches rather
  // than a single .or() filter string — PostgREST's .or() syntax uses
  // "column.op.value" with dots as separators, and email addresses always
  // contain dots, which would corrupt that filter string.
  const memberLookup = admin.from("wedding_members").select("id").eq("wedding_id", weddingId);
  const { data: existingMember } = invitedUserId
    ? await memberLookup.eq("user_id", invitedUserId).maybeSingle()
    : await memberLookup.eq("invited_email", email).maybeSingle();

  // invited_email always stays set to the target address, even once
  // user_id is also known — it's the only permanent record of who an
  // invite actually went to (see migration 0015: the trigger used to null
  // it out the moment an invite was claimed, which meant "Resend invite"
  // had nothing left to send to if anything downstream ever went wrong,
  // e.g. a missing profiles row).
  const memberPayload: {
    wedding_id: string;
    user_id: string | null;
    invited_email: string;
    role: string;
    invited_name?: string;
  } = { wedding_id: weddingId, user_id: invitedUserId, invited_email: email, role };

  // Only set when actually provided — e.g. a resend that doesn't re-ask for
  // a name shouldn't clobber whatever name was captured on the original invite.
  if (name) {
    memberPayload.invited_name = name;
  }

  const { error: dbError } = existingMember
    ? await admin.from("wedding_members").update(memberPayload).eq("id", existingMember.id)
    : await admin.from("wedding_members").insert(memberPayload);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, emailSent });
}
