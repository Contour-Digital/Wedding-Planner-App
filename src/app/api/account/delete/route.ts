import { NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

// Deletes the signed-in user's account entirely. Restricted to someone who
// owns at least one wedding — deleting doesn't just remove this account, it
// wipes that wedding (tasks, budget, vendors, timeline, contacts, everyone
// else's access) too, so only the one role with the authority to make that
// call for everyone else can trigger it. A non-owner member has no
// self-service path here — the owner removes their access instead, from
// Sharing.
//
// Requires SUPABASE_SERVICE_ROLE_KEY, same as /api/invite — deleting an
// auth user and another wedding's data both need it.
export async function POST() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { data: memberships } = await supabase
    .from("wedding_members")
    .select("wedding_id, role")
    .eq("user_id", user.id);

  const ownedWeddingIds = (memberships ?? []).filter((m) => m.role === "owner").map((m) => m.wedding_id);

  if (ownedWeddingIds.length === 0) {
    return NextResponse.json(
      { error: "Only the wedding owner can delete their account. Ask them to remove your access instead." },
      { status: 403 }
    );
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      {
        error:
          "Account deletion isn't configured yet — add a SUPABASE_SERVICE_ROLE_KEY environment variable (Supabase dashboard → Project Settings → API) and redeploy.",
      },
      { status: 500 }
    );
  }

  const admin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Deleting each owned wedding cascades everything under it — memberships,
  // tasks, budget, vendors, timeline, contacts, inspiration — for every
  // person with access, not just this account.
  for (const weddingId of ownedWeddingIds) {
    const { error } = await admin.from("weddings").delete().eq("id", weddingId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Anything left is this account's own membership on a wedding someone
  // else owns — just their access to it, not the wedding itself.
  await admin.from("wedding_members").delete().eq("user_id", user.id);
  // Belt and braces alongside auth.users cascading to profiles — leaves no
  // orphaned row either way.
  await admin.from("profiles").delete().eq("id", user.id);

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteUserError) {
    return NextResponse.json({ error: deleteUserError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
