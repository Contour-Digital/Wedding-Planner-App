import { NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

// Public read + claim endpoint for an invite link (/invite/[id] is the page
// that calls this). The id is the wedding_members row's own UUID — already
// unguessable, so it doubles as the link's token with no separate table.
//
// GET is reachable by anyone, signed in or not (see the /invite and
// /api/invite-link allowlist in src/lib/supabase/middleware.ts) — it's how
// the invite page finds out what it's showing before the visitor has done
// anything. It only ever returns the minimum needed to render that page,
// never the wedding's other data.
function adminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) return null;
  return createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const admin = adminClient();
  if (!admin) return NextResponse.json({ valid: false }, { status: 500 });

  const { data: member } = await admin
    .from("wedding_members")
    .select("wedding_id, role, invited_email, invited_name, user_id")
    .eq("id", params.id)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ valid: false });
  }

  const { data: wedding } = await admin
    .from("weddings")
    .select("partner_1, partner_2")
    .eq("id", member.wedding_id)
    .maybeSingle();

  const weddingLabel =
    wedding?.partner_1 && wedding?.partner_2 ? `${wedding.partner_1} & ${wedding.partner_2}` : "this wedding";

  // "Already accepted" means someone has actually signed in with this
  // membership's credentials — not just that an account exists for it. An
  // invite (this one or /api/invite/route.ts's onboarding equivalent)
  // creates the account with a generated password up front, so accountReady
  // is normally true from the moment the invite is made; everSignedIn only
  // flips once they've actually used it.
  let everSignedIn = false;
  if (member.user_id) {
    const { data: userData } = await admin.auth.admin.getUserById(member.user_id);
    everSignedIn = userData?.user?.last_sign_in_at != null;
  }

  return NextResponse.json({
    valid: true,
    everSignedIn,
    accountReady: member.user_id !== null,
    role: member.role,
    invitedName: member.invited_name,
    invitedEmail: member.invited_email,
    weddingLabel,
  });
}

// Legacy fallback only, for a pending row created before generated
// passwords existed (accountReady: false — no user_id yet). Anything
// invited since always has accountReady: true and signs in directly on the
// page with the password it was given; this POST is never called for that
// case.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const admin = adminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Invites aren't configured — SUPABASE_SERVICE_ROLE_KEY is missing." },
      { status: 500 }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { data: member } = await admin
    .from("wedding_members")
    .select("id, wedding_id, invited_email, invited_name, user_id")
    .eq("id", params.id)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "This invite link isn't valid." }, { status: 404 });
  }

  if (member.user_id !== null) {
    return NextResponse.json({ error: "This invite already has an account — sign in instead." }, { status: 409 });
  }

  const password = body.password;
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Enter a password of at least 6 characters." }, { status: 400 });
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: member.invited_email,
    password,
    email_confirm: true,
    user_metadata: member.invited_name ? { full_name: member.invited_name } : undefined,
  });

  if (createError || !created?.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Couldn't create your account. Try refreshing and signing in instead." },
      { status: 400 }
    );
  }

  // The server client here is cookie-bound (see src/lib/supabase/server.ts)
  // — signing in on it writes the session cookie onto the response, so the
  // browser has a real session once it follows the redirect.
  const supabase = createServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: member.invited_email, password });
  if (signInError) return NextResponse.json({ error: signInError.message }, { status: 400 });

  await admin.from("wedding_members").update({ user_id: created.user.id }).eq("id", member.id);

  return NextResponse.json({ ok: true, weddingId: member.wedding_id });
}
