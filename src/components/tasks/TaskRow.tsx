"use client";

import { createClient } from "@/lib/supabase/client";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useMembers } from "@/lib/hooks/useMembers";
import { logActivity } from "@/lib/activity/logActivity";
import { Badge } from "@/components/ui/Badge";
import { formatDate, isOverdue } from "@/lib/utils/date";
import { TASK_CATEGORY_LABEL } from "./taskMeta";
import type { Task } from "@/lib/types/database";

export function TaskRow({ task, onEdit, onChanged }: { task: Task; onEdit: () => void; onChanged: () => void }) {
  const { wedding, user } = useWedding();
  const { members } = useMembers(wedding?.id);
  const supabase = createClient();

  const overdue = isOverdue(task.due_date, task.completed);
  const assignee = task.assigned_to_both
    ? "Both partners"
    : task.assigned_user_id
    ? members.find((m) => m.user_id === task.assigned_user_id)?.profile?.full_name ?? "Assigned"
    : "Unassigned";

  async function toggleComplete() {
    const completed = !task.completed;
    await supabase
      .from("tasks")
      .update({ completed, completed_at: completed ? new Date().toISOString() : null })
      .eq("id", task.id);

    if (wedding && user) {
      await logActivity(supabase, {
        weddingId: wedding.id,
        userId: user.id,
        actionType: completed ? "task.completed" : "task.reopened",
        description: `${completed ? "Completed" : "Reopened"} task "${task.title}".`,
        entityType: "task",
        entityId: task.id,
      });
    }
    onChanged();
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-line bg-white p-4">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={toggleComplete}
        className="mt-1 h-5 w-5 shrink-0 rounded border-line"
        aria-label={`Mark "${task.title}" ${task.completed ? "incomplete" : "complete"}`}
      />
      <div className="flex-1 cursor-pointer" onClick={onEdit}>
        <p className={`text-sm font-medium ${task.completed ? "text-muted line-through" : ""}`}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
          <Badge className="bg-line text-muted">{TASK_CATEGORY_LABEL[task.category]}</Badge>
          <span>{assignee}</span>
          {task.due_date && (
            <span className={overdue ? "font-medium text-danger" : ""}>Due {formatDate(task.due_date)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
