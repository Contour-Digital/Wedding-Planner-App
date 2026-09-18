import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/server/push";

// Fired (fire-and-forget, from the client) right after a task is created or
// edited with an assignment — see TaskModal.tsx. Never notifies the person
// who made the change: assigning a task to yourself, or editing one that's
// already assigned to you, shouldn't buzz your own phone.
export async function POST(request: Request) {
  let body: { taskId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.taskId) {
    return NextResponse.json({ error: "Missing task." }, { status: 400 });
  }

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("id, wedding_id, title, assigned_user_id, assigned_to_both")
    .eq("id", body.taskId)
    .maybeSingle();
  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  let recipientIds: string[] = [];
  if (task.assigned_to_both) {
    const { data: members } = await supabase
      .from("wedding_members")
      .select("user_id, role")
      .eq("wedding_id", task.wedding_id)
      .in("role", ["owner", "editor"]);
    recipientIds = (members ?? [])
      .map((m) => m.user_id)
      .filter((id): id is string => !!id && id !== user.id);
  } else if (task.assigned_user_id && task.assigned_user_id !== user.id) {
    recipientIds = [task.assigned_user_id];
  }

  await Promise.all(
    recipientIds.map((id) =>
      sendPushToUser(id, task.wedding_id, "task_assigned", {
        title: "New task assigned",
        body: task.title,
        url: "/tasks",
      })
    )
  );

  return NextResponse.json({ ok: true });
}
