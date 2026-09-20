"use client";

import { useState } from "react";
import { PageHeader } from "@/components/nav/PageHeader";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useTasks } from "@/lib/hooks/useTasks";
import { useMembers } from "@/lib/hooks/useMembers";
import { Button } from "@/components/ui/Button";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskModal } from "@/components/tasks/TaskModal";
import type { Task } from "@/lib/types/database";

type Filter = "open" | "completed" | "all";

export default function TasksPage() {
  const { wedding } = useWedding();
  const { tasks, refresh } = useTasks(wedding?.id);
  const { members } = useMembers(wedding?.id);
  const [filter, setFilter] = useState<Filter>("open");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  // Bumped on every open so TaskModal remounts with a fresh key each time —
  // its form fields are only seeded from `task` on mount, so without this,
  // reopening it for a different task (or for "add" after an edit) would
  // keep showing whatever was loaded the first time the modal ever opened.
  const [modalKey, setModalKey] = useState(0);

  const filtered = tasks.filter((t) => {
    if (filter === "open") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  // Grouped by assignee instead of one flat list — named people first (in
  // the order they joined), then joint tasks, then whatever's still
  // unassigned. Only groups that actually have a task in the current
  // filter get a heading.
  const people = members.filter((m) => m.user_id);
  const groups = [
    ...people.map((person) => ({
      key: person.user_id as string,
      label: person.profile?.full_name ?? person.profile?.email ?? "Member",
      tasks: filtered.filter((t) => !t.assigned_to_both && t.assigned_user_id === person.user_id),
    })),
    {
      key: "both",
      label: "Both partners",
      tasks: filtered.filter((t) => t.assigned_to_both),
    },
    {
      key: "unassigned",
      label: "Unassigned",
      tasks: filtered.filter((t) => !t.assigned_to_both && !t.assigned_user_id),
    },
  ].filter((group) => group.tasks.length > 0);

  function openAdd() {
    setEditingTask(null);
    setModalKey((k) => k + 1);
    setModalOpen(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setModalKey((k) => k + 1);
    setModalOpen(true);
  }

  return (
    <div>
      <PageHeader title="Tasks" />
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {(["open", "completed", "all"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize ${
                  filter === f ? "border-primaryStrong bg-primary/10 text-primaryStrong" : "border-line text-muted"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <Button onClick={openAdd}>+ Add task</Button>
        </div>

        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.key} className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{group.label}</h3>
              <div className="space-y-2">
                {group.tasks.map((task) => (
                  <TaskRow key={task.id} task={task} onEdit={() => openEdit(task)} onChanged={refresh} />
                ))}
              </div>
            </div>
          ))}
          {groups.length === 0 && <p className="text-sm text-muted">Nothing here.</p>}
        </div>
      </div>

      <TaskModal key={modalKey} open={modalOpen} onClose={() => setModalOpen(false)} task={editingTask} onSaved={refresh} />
    </div>
  );
}
