"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useCategories } from "@/lib/hooks/useCategories";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatCurrency } from "@/lib/utils/currency";
import { AddCategoryForm } from "./AddCategoryForm";

// Rename-in-place: renaming a category is just an UPDATE, so every expense
// keeps its category_id and "moves with" the rename automatically — no
// migration needed. Deleting reassigns affected expenses to Uncategorised
// rather than losing them.
export function CategoryManager() {
  const { wedding } = useWedding();
  const { categories, refresh } = useCategories(wedding?.id);
  const supabase = createClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editNameError, setEditNameError] = useState(false);

  if (!wedding) return null;

  const removingCategory = categories.find((c) => c.id === removingId) ?? null;

  function startEdit(id: string, name: string, target: number) {
    setEditingId(id);
    setEditName(name);
    setEditTarget(String(target));
    setEditNameError(false);
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) {
      setEditNameError(true);
      return;
    }
    await supabase
      .from("expense_categories")
      .update({ name: editName.trim(), target_budget: Number(editTarget) || 0 })
      .eq("id", id);
    setEditingId(null);
    refresh();
  }

  async function removeCategory(id: string) {
    setRemovingId(null);
    const uncategorised = categories.find((c) => c.is_uncategorised);
    if (uncategorised) {
      // Preserve existing expenses by moving them to Uncategorised instead
      // of leaving a dangling / deleted category reference.
      await supabase
        .from("expenses")
        .update({ category_id: uncategorised.id })
        .eq("category_id", id);
    }
    await supabase.from("expense_categories").delete().eq("id", id);
    refresh();
  }

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-semibold">Expense categories</h3>
        <p className="text-xs text-muted">
          Rename or remove categories any time — existing expenses move with a rename, and are reassigned to
          &quot;Uncategorised&quot; if their category is removed.
        </p>
      </div>

      <div className="space-y-2">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-2 rounded-xl border border-line p-2.5">
            {editingId === c.id ? (
              <>
                <div className="flex-1">
                  <Input
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value);
                      if (editNameError) setEditNameError(false);
                    }}
                    className={editNameError ? "border-danger focus:border-danger focus:ring-danger/20" : undefined}
                  />
                  {editNameError && <p className="mt-1 text-xs text-danger">Required</p>}
                </div>
                <Input
                  type="number"
                  value={editTarget}
                  onChange={(e) => setEditTarget(e.target.value)}
                  className="w-28"
                />
                <Button onClick={() => saveEdit(c.id)} className="shrink-0">
                  Save
                </Button>
                <Button variant="ghost" onClick={() => setEditingId(null)} className="shrink-0">
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted">Budget {formatCurrency(c.target_budget, wedding.currency)}</p>
                </div>
                {!c.is_uncategorised && (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => startEdit(c.id, c.name, c.target_budget)}
                      className="shrink-0"
                    >
                      Edit
                    </Button>
                    <Button variant="ghost" onClick={() => setRemovingId(c.id)} className="shrink-0 text-danger">
                      Remove
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-line pt-4">
        <AddCategoryForm categories={categories} onAdded={refresh} />
      </div>

      <ConfirmDialog
        open={removingCategory !== null}
        title="Remove category"
        message={
          removingCategory
            ? `Remove "${removingCategory.name}"? Any expenses in it move to Uncategorised — nothing is deleted.`
            : ""
        }
        onConfirm={() => removingCategory && removeCategory(removingCategory.id)}
        onCancel={() => setRemovingId(null)}
      />
    </Card>
  );
}
