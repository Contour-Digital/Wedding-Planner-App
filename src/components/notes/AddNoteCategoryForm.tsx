"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { NoteCategory } from "@/lib/types/database";

export function AddNoteCategoryForm({ categories, onAdded }: { categories: NoteCategory[]; onAdded: () => void }) {
  const { wedding } = useWedding();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState(false);

  if (!wedding) return null;

  async function addCategory() {
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    await supabase.from("note_categories").insert({
      wedding_id: wedding!.id,
      name: name.trim(),
      sort_order: categories.length,
    });
    setName("");
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
          placeholder="e.g. Decor"
          className={nameError ? "border-danger focus:border-danger focus:ring-danger/20" : undefined}
        />
        {nameError && <p className="mt-1 text-xs text-danger">Required</p>}
      </div>
      <Button onClick={addCategory}>Add</Button>
    </div>
  );
}
