import { NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { generatePassword } from "@/lib/server/generatePassword";

// Looks an account up in auth.users directly by email, rather than via the
// profiles table — confirmed (twice, on this project's live data) that
// profiles can go out of sync with auth.users, e.g. a row missing for an
// account that still exists. Trusting profiles for "does this email
// already have an account" caused two different bugs: orphaned
// wedding_members rows with no way to ever resend to, and createUser()
// failing with "A user with this email address has already been
// registered" because an auth.users row existed that profiles didn't know
// about. supabase-js has no getUserByEmail, so this pages through
// listUsers — fine at this app's scale.
async function findAuthUserByEmail(admin: SupabaseClient, email: string): Promise<User | null> {
  const perPage = 200;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data) return null;
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < perPage) return null;
  }
  return null;
}

// Creates (or resets) an invitee's account and hands back a ready-to-send
// message — a link plus a password — instead of an email. Email delivery
// (Supabase's own mailer, and Resend before it) wasn't reliably reaching
// invitees, and even the follow-up link-only approach ("set your own
// password when you first open the link") left a confusing window where an
// account existed but nobody had signed into it yet — see the wording
// change to "confirmed" in migration 0016. Handing over a working password
// up front removes that window entirely: the account is ready to use the
// moment this returns.
//
// Requires a SUPABASE_SERVICE_ROLE_KEY env var (Supabase dashboard → Project
// Settings → API → service_role secret) — server-only, no NEXT_PUBLIC_
// prefix — since reading/writing wedding_members and creating auth users
// for someone else both need it.
//
// Rate limited per wedding (see invite_requests below) — a sane cap on how
// many invites/resets one wedding can generate per hour.
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

  const { data: wedding } = await supabase
    .from("weddings")
    .select("partner_1, partner_2")
    .eq("id", weddingId)
    .maybeSingle();
  const inviterLabel =
    wedding?.partner_1 && wedding?.partner_2 ? `${wedding.partner_1} & ${wedding.partner_2}` : "The wedding couple";

  // Grant access immediately, with no new credentials, only for someone
  // who has genuinely already signed in before — not just anyone with an
  // account, since that account might be one WE created via a previous
  // invite that nobody has ever actually logged into yet. Whether Supabase
  // has ever recorded a real sign-in is what tells those two apart.
  const existingAuthUser = await findAuthUserByEmail(admin, email);
  const everSignedIn = existingAuthUser?.last_sign_in_at != null;

  // Look up any existing row for this person on this wedding first — a
  // prior pending invite, or a re-invite that should reset their
  // credentials rather than create a duplicate account. Two separate
  // .eq() branches rather than a single .or() filter string — PostgREST's
  // .or() syntax uses "column.op.value" with dots as separators, and email
  // addresses always contain dots, which would corrupt that filter string.
  const memberLookup = admin.from("wedding_members").select("id, user_id").eq("wedding_id", weddingId);
  const { data: existingMember } = existingAuthUser
    ? await memberLookup.eq("user_id", existingAuthUser.id).maybeSingle()
    : await memberLookup.eq("invited_email", email).maybeSingle();

  let invitedUserId: string | null = everSignedIn ? existingAuthUser!.id : null;
  let password: string | null = null;
  let inviteLink: string | null = null;
  let message: string | null = null;

  if (!invitedUserId) {
    // No account yet ever signed into for this email — create one (or
    // reset its password if we already made it for a prior invite that
    // went unused) with a fresh generated password. email_confirm: true
    // skips Supabase's own confirmation round-trip entirely: the couple
    // handing this password to the invitee, out of band, is itself the
    // confirmation.
    password = generatePassword();
    const targetUserId = existingAuthUser?.id ?? existingMember?.user_id ?? null;

    if (targetUserId) {
      const { error: updateError } = await admin.auth.admin.updateUserById(targetUserId, { password });
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
      invitedUserId = targetUserId;
    } else {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: name ? { full_name: name } : undefined,
      });
      if (createError || !created?.user) {
        // Last-resort fallback: createUser can still fail with "already
        // registered" in the narrow window between the listUsers lookup
        // above and this call (e.g. a concurrent invite for the same
        // email), or if listUsers missed a page under load. One more
        // direct lookup and, if found this time, reset its password
        // instead of giving up.
        const fallbackUser = await findAuthUserByEmail(admin, email);
        if (fallbackUser) {
          const { error: updateError } = await admin.auth.admin.updateUserById(fallbackUser.id, { password });
          if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
          invitedUserId = fallbackUser.id;
        } else {
          return NextResponse.json(
            { error: createError?.message ?? "Couldn't create that invite." },
            { status: 400 }
          );
        }
      } else {
        invitedUserId = created.user.id;
      }
    }
  }

  if (!invitedUserId) {
    // Unreachable in practice — every branch above either sets it or
    // returns early — but narrows the type for what follows.
    return NextResponse.json({ error: "Something went wrong creating that invite." }, { status: 500 });
  }

  const memberPayload: {
    wedding_id: string;
    user_id: string;
    invited_email: string;
    role: string;
    invited_name?: string;
  } = { wedding_id: weddingId, user_id: invitedUserId, invited_email: email, role };
  if (name) memberPayload.invited_name = name;

  // The invite link's token is this wedding_members row's own id, not the
  // auth user's id — one person can be invited to more than one wedding,
  // and the link needs to say which membership it's for, not just who.
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

  if (password) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
    inviteLink = `${siteUrl}/invite/${memberId}`;
    message = `${inviterLabel} invited you to help plan their wedding! 💍\n\nJoin here: ${inviteLink}\nYour password: ${password}\n\n(You can change your password after signing in.)`;
  }

  return NextResponse.json({ ok: true, inviteLink, password, message, alreadyHasAccess: password === null });
}
