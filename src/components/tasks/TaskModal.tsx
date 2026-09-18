"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useMembers } from "@/lib/hooks/useMembers";
import { logActivity } from "@/lib/activity/logActivity";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { TASK_CATEGORY_LABEL, TASK_CATEGORY_OPTIONS } from "./taskMeta";
import type { Task, TaskCategory } from "@/lib/types/database";

export function TaskModal({
  open,
  onClose,
  task,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  onSaved: () => void;
}) {
  const { wedding, user } = useWedding();
  const { members } = useMembers(wedding?.id);
  const supabase = createClient();

  const [title, setTitle] = useState(task?.title ?? "");
  const [assignedTo, setAssignedTo] = useState<string>(
    task?.assigned_to_both ? "both" : task?.assigned_user_id ?? "unassigned"
  );
  const [category, setCategory] = useState<TaskCategory>(task?.category ?? "general");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const people = members.filter((m) => m.user_id);
  // Captured once (this modal remounts via a fresh key on every open — see
  // tasks/page.tsx's modalKey — so task itself never changes mid-session)
  // to tell "assignment changed" from "assignment saved again unchanged",
  // so editing a task's due date doesn't re-notify its existing assignee.
  const initialAssignedTo = task?.assigned_to_both ? "both" : task?.assigned_user_id ?? "unassigned";

  async function handleSave() {
    if (!wedding || !user || !title.trim()) return;
    setSaving(true);

    const payload = {
      wedding_id: wedding.id,
      title: title.trim(),
      assigned_to_both: assignedTo === "both",
      assigned_user_id: assignedTo !== "both" && assignedTo !== "unassigned" ? assignedTo : null,
      category,
      due_date: dueDate || null,
      notes: notes.trim() || null,
    };

    let taskId = task?.id;
    if (task) {
      await supabase.from("tasks").update(payload).eq("id", task.id);
    } else {
      const { data: inserted } = await supabase.from("tasks").insert(payload).select("id").single();
      taskId = inserted?.id;
    }

    await logActivity(supabase, {
      weddingId: wedding.id,
      userId: user.id,
      actionType: task ? "task.updated" : "task.created",
      description: task ? `Updated task "${title.trim()}".` : `Added task "${title.trim()}".`,
      entityType: "task",
      entityId: task?.id,
    });

    if (taskId && assignedTo !== "unassigned" && (!task || assignedTo !== initialAssignedTo)) {
      fetch("/api/notify/task-assigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      }).catch(() => {
        // Best-effort — the task itself already saved fine either way.
      });
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={task ? "Edit task" : "Add task"}>
      <div className="space-y-4">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Assigned to">
          <Select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="unassigned">Unassigned</option>
            <option value="both">Both partners</option>
            {people.map((m) => (
              <option key={m.user_id} value={m.user_id!}>
                {m.profile?.full_name ?? m.profile?.email ?? "Member"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Category">
          <Select value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)}>
            {TASK_CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {TASK_CATEGORY_LABEL[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Due date">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Button fullWidth onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save task"}
        </Button>
      </div>
    </Modal>
  );
}
