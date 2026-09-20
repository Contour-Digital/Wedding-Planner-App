"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { InspirationCategory } from "@/lib/types/database";

// "all" and "uncategorized" are client-side pseudo-filters, not rows —
// there's always an "uncategorized" bucket (any photo whose category got
// deleted lands there via ON DELETE SET NULL) even though it never exists
// as a category row of its own.
export type CategoryFilter = "all" | "uncategorized" | string;

function pillClass(active: boolean) {
  return clsx(
    "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium",
    active ? "border-primaryStrong bg-primary/10 text-primaryStrong" : "border-line text-muted"
  );
}

export function CategoryTabs({
  weddingId,
  categories,
  active,
  onSelect,
  editable,
  onChanged,
}: {
  weddingId: string;
  categories: InspirationCategory[];
  active: CategoryFilter;
  onSelect: (filter: CategoryFilter) => void;
  editable: boolean;
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNameError, setNewNameError] = useState(false);
  const [removingCategory, setRemovingCategory] = useState<InspirationCategory | null>(null);

  async function addCategory() {
    if (!newName.trim()) {
      setNewNameError(true);
      return;
    }
    await supabase.from("inspiration_categories").insert({
      wedding_id: weddingId,
      name: newName.trim(),
      sort_order: categories.length,
    });
    setNewName("");
    setAdding(false);
    onChanged();
  }

  async function removeCategory(category: InspirationCategory) {
    setRemovingCategory(null);
    await supabase.from("inspiration_categories").delete().eq("id", category.id);
    if (active === category.id) onSelect("all");
    onChanged();
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button className={pillClass(active === "all")} onClick={() => onSelect("all")}>
          All
        </button>
        <button className={pillClass(active === "uncategorized")} onClick={() => onSelect("uncategorized")}>
          Uncategorized
        </button>
        {categories.map((c) => (
          <div key={c.id} className={clsx(pillClass(active === c.id), "flex shrink-0 items-center gap-1 pr-2")}>
            <button onClick={() => onSelect(c.id)}>{c.name}</button>
            {editable && (
              <button
                onClick={() => setRemovingCategory(c)}
                aria-label={`Remove ${c.name} category`}
                className="text-muted hover:text-danger"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {editable && (
          <button className={pillClass(false)} onClick={() => setAdding((v) => !v)}>
            {adding ? "Cancel" : "+ Category"}
          </button>
        )}
      </div>

      {adding && (
        <div className="flex gap-2">
          <div>
            <Input
              autoFocus
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (newNameError) setNewNameError(false);
              }}
              placeholder="e.g. Florals"
              className={`max-w-xs ${newNameError ? "border-danger focus:border-danger focus:ring-danger/20" : ""}`}
            />
            {newNameError && <p className="mt-1 text-xs text-danger">Required</p>}
          </div>
          <Button onClick={addCategory}>Add</Button>
        </div>
      )}

      <ConfirmDialog
        open={removingCategory !== null}
        title="Remove category"
        message={
          removingCategory
            ? `Remove "${removingCategory.name}"? Its photos move to Uncategorized — nothing is deleted.`
            : ""
        }
        onConfirm={() => removingCategory && removeCategory(removingCategory)}
        onCancel={() => setRemovingCategory(null)}
      />
    </div>
  );
}
