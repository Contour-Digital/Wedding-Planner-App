"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { logActivity } from "@/lib/activity/logActivity";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ExpenseCategory } from "@/lib/types/database";

// Shared by the Budget page (quick capture) and /budget/categories (the
// full manager) so there's one place that knows how to insert a category
// and log the activity, instead of two copies drifting apart.
export function AddCategoryForm({
  categories,
  onAdded,
}: {
  categories: ExpenseCategory[];
  onAdded: () => void;
}) {
  const { wedding, user } = useWedding();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [nameError, setNameError] = useState(false);

  if (!wedding) return null;

  async function addCategory() {
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    await supabase.from("expense_categories").insert({
      wedding_id: wedding!.id,
      name: name.trim(),
      target_budget: Number(target) || 0,
      sort_order: categories.length,
    });
    if (user) {
      await logActivity(supabase, {
        weddingId: wedding!.id,
        userId: user.id,
        actionType: "category.created",
        description: `Added expense category "${name.trim()}".`,
        entityType: "expense_category",
      });
    }
    setName("");
    setTarget("");
    setNameError(false);
    onAdded();
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-muted">New category</label>
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError(false);
          }}
          placeholder="e.g. Hair & Makeup"
          className={nameError ? "border-danger focus:border-danger focus:ring-danger/20" : undefined}
        />
        {nameError && <p className="mt-1 text-xs text-danger">Required</p>}
      </div>
      <div className="w-28">
        <label className="mb-1 block text-xs font-medium text-muted">Budget</label>
        <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
      </div>
      <Button onClick={addCategory}>Add</Button>
    </div>
  );
}
