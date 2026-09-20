"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { ExpenseCategory } from "@/lib/types/database";

// A lightweight, dependency-free drag list built on the Pointer Events API
// (not the HTML5 drag-and-drop API, which has no real touch support) — the
// drag handle captures the pointer on press, so move/up events keep firing
// on it no matter what element the pointer is physically over, and
// elementFromPoint + a data-row-index attribute is how it finds which row
// it's currently hovering to swap with.
export function ReorderCategoriesModal({
  open,
  onClose,
  categories,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  categories: ExpenseCategory[];
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [order, setOrder] = useState<ExpenseCategory[]>(categories);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Re-seed from the latest saved order every time the modal opens, rather
  // than continuing from whatever was left over from the last time it was
  // opened and cancelled.
  useEffect(() => {
    if (open) setOrder(categories);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handlePointerDown(e: React.PointerEvent<HTMLSpanElement>, index: number) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragIndex(index);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLSpanElement>) {
    if (dragIndex === null) return;
    const hovered = document.elementFromPoint(e.clientX, e.clientY);
    const row = hovered?.closest<HTMLElement>("[data-row-index]");
    if (!row) return;
    const overIndex = Number(row.dataset.rowIndex);
    if (Number.isNaN(overIndex) || overIndex === dragIndex) return;
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(overIndex, 0, moved);
      return next;
    });
    setDragIndex(overIndex);
  }

  function handlePointerUp() {
    setDragIndex(null);
  }

  async function handleSave() {
    setSaving(true);
    await Promise.all(
      order.map((category, index) =>
        supabase.from("expense_categories").update({ sort_order: index }).eq("id", category.id)
      )
    );
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Arrange categories">
      <div className="space-y-3">
        <p className="text-xs text-muted">
          Drag to reorder — this is how categories will appear on the Budget page.
        </p>
        <div className="space-y-2">
          {order.map((category, index) => (
            <div
              key={category.id}
              data-row-index={index}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                dragIndex === index ? "border-primaryStrong bg-primary/10" : "border-line bg-white"
              }`}
            >
              <span
                onPointerDown={(e) => handlePointerDown(e, index)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                aria-label={`Drag to reorder ${category.name}`}
                className="touch-none select-none px-1 text-lg leading-none text-muted active:cursor-grabbing"
                style={{ cursor: "grab" }}
              >
                ⠿
              </span>
              <span className="text-sm font-medium">{category.name}</span>
            </div>
          ))}
        </div>
        <Button fullWidth onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save order"}
        </Button>
      </div>
    </Modal>
  );
}
