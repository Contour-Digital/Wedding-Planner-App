"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { NoteCategory } from "@/lib/types/database";

export function EditNoteCategoryModal({
  category,
  onClose,
  onChanged,
}: {
  category: NoteCategory | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [name, setName] = useState(category?.name ?? "");
  const [nameError, setNameError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function reset() {
    setName(category?.name ?? "");
    setNameError(false);
  }

  async function handleSave() {
    if (!category) return;
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    setSaving(true);
    await supabase.from("note_categories").update({ name: name.trim() }).eq("id", category.id);
    setSaving(false);
    onChanged();
    onClose();
  }

  async function handleRemove() {
    if (!category) return;
    setConfirmingDelete(false);
    await supabase.from("note_categories").delete().eq("id", category.id);
    onChanged();
    onClose();
  }

  return (
    <Modal
      open={category !== null}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Edit category"
    >
      {category && (
        <div className="space-y-4">
          <Field label="Category name" error={nameError}>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(false);
              }}
            />
          </Field>

          <div className="flex gap-2">
            <Button fullWidth onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
              Remove
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmingDelete}
        title="Remove category"
        message={
          category ? `Remove "${category.name}"? Its notes move to Uncategorized — nothing is deleted.` : ""
        }
        onConfirm={handleRemove}
        onCancel={() => setConfirmingDelete(false)}
      />
    </Modal>
  );
}
