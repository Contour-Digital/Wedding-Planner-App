"use client";

import { useState } from "react";
import { PageHeader } from "@/components/nav/PageHeader";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useTasks } from "@/lib/hooks/useTasks";
import { Button } from "@/components/ui/Button";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskModal } from "@/components/tasks/TaskModal";
import type { Task } from "@/lib/types/database";

type Filter = "open" | "completed" | "all";

export default function TasksPage() {
  const { wedding } = useWedding();
  const { tasks, refresh } = useTasks(wedding?.id);
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

        <div className="space-y-2">
          {filtered.map((task) => (
            <TaskRow key={task.id} task={task} onEdit={() => openEdit(task)} onChanged={refresh} />
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted">Nothing here.</p>}
        </div>
      </div>

      <TaskModal key={modalKey} open={modalOpen} onClose={() => setModalOpen(false)} task={editingTask} onSaved={refresh} />
    </div>
  );
}
