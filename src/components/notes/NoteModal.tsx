"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { logActivity } from "@/lib/activity/logActivity";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Note, NoteCategory } from "@/lib/types/database";

export function NoteModal({
  open,
  onClose,
  categories,
  note,
  defaultCategoryId,
  editable,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  categories: NoteCategory[];
  note?: Note | null;
  defaultCategoryId?: string | null;
  editable: boolean;
  onSaved: () => void;
}) {
  const { wedding, user } = useWedding();
  const supabase = createClient();

  const [title, setTitle] = useState(note?.title ?? "");
  const [categoryId, setCategoryId] = useState(note?.category_id ?? defaultCategoryId ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [contentError, setContentError] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function reset() {
    setTitle(note?.title ?? "");
    setCategoryId(note?.category_id ?? defaultCategoryId ?? "");
    setContent(note?.content ?? "");
    setContentError(false);
  }

  async function handleSave() {
    if (!wedding || !user) return;
    if (!content.trim()) {
      setContentError(true);
      return;
    }
    setSaving(true);

    const payload = {
      wedding_id: wedding.id,
      category_id: categoryId || null,
      title: title.trim() || null,
      content: content.trim(),
    };

    let noteId = note?.id;
    if (noteId) {
      await supabase.from("notes").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", noteId);
    } else {
      const { data } = await supabase
        .from("notes")
        .insert({ ...payload, created_by: user.id })
        .select()
        .single();
      noteId = data?.id;
    }

    await logActivity(supabase, {
      weddingId: wedding.id,
      userId: user.id,
      actionType: note ? "note.updated" : "note.created",
      description: note ? `Updated a note.` : `Added a note.`,
      entityType: "note",
      entityId: noteId,
    });

    setSaving(false);
    onSaved();
    onClose();
  }

  async function handleDelete() {
    if (!note || !wedding || !user) return;
    setConfirmingDelete(false);
    await supabase.from("notes").delete().eq("id", note.id);
    await logActivity(supabase, {
      weddingId: wedding.id,
      userId: user.id,
      actionType: "note.removed",
      description: "Removed a note.",
      entityType: "note",
      entityId: note.id,
    });
    onSaved();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={note ? "Edit note" : "Add note"}
    >
      <div className="space-y-4">
        <Field label="Title" hint="Optional">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Florals idea" disabled={!editable} />
        </Field>

        <Field label="Category">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={!editable}>
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Note" error={contentError}>
          <Textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (contentError) setContentError(false);
            }}
            rows={6}
            placeholder="Write your idea here…"
            disabled={!editable}
          />
        </Field>

        {editable && (
          <div className="flex gap-2">
            <Button fullWidth onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save note"}
            </Button>
            {note && (
              <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete note"
        message="Delete this note? This can't be undone."
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </Modal>
  );
}
