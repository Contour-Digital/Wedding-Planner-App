"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useCategories } from "@/lib/hooks/useCategories";
import { logActivity } from "@/lib/activity/logActivity";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils/currency";

// Rename-in-place: renaming a category is just an UPDATE, so every expense
// keeps its category_id and "moves with" the rename automatically — no
// migration needed. Deleting reassigns affected expenses to Uncategorised
// rather than losing them.
export function CategoryManager() {
  const { wedding, user } = useWedding();
  const { categories, refresh } = useCategories(wedding?.id);
  const supabase = createClient();
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTarget, setEditTarget] = useState("");

  if (!wedding) return null;

  async function addCategory() {
    if (!newName.trim()) return;
    await supabase.from("expense_categories").insert({
      wedding_id: wedding!.id,
      name: newName.trim(),
      target_budget: Number(newTarget) || 0,
      sort_order: categories.length,
    });
    if (user) {
      await logActivity(supabase, {
        weddingId: wedding!.id,
        userId: user.id,
        actionType: "category.created",
        description: `Added expense category "${newName.trim()}".`,
        entityType: "expense_category",
      });
    }
    setNewName("");
    setNewTarget("");
    refresh();
  }

  function startEdit(id: string, name: string, target: number) {
    setEditingId(id);
    setEditName(name);
    setEditTarget(String(target));
  }

  async function saveEdit(id: string) {
    await supabase
      .from("expense_categories")
      .update({ name: editName.trim(), target_budget: Number(editTarget) || 0 })
      .eq("id", id);
    setEditingId(null);
    refresh();
  }

  async function removeCategory(id: string) {
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
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1" />
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
                  <p className="text-xs text-muted">Target {formatCurrency(c.target_budget, wedding.currency)}</p>
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
                    <Button variant="ghost" onClick={() => removeCategory(c.id)} className="shrink-0 text-danger">
                      Remove
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-end gap-2 border-t border-line pt-4">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted">New category</label>
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Hair & Makeup" />
        </div>
        <div className="w-28">
          <label className="mb-1 block text-xs font-medium text-muted">Target</label>
          <Input type="number" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} />
        </div>
        <Button onClick={addCategory}>Add</Button>
      </div>
    </Card>
  );
}
