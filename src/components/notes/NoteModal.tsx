"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { logActivity } from "@/lib/activity/logActivity";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { INSPIRATION_BUCKET, inspirationPhotoUrl, sanitizeFilename } from "@/lib/utils/inspirationPhotos";
import type { Note, NoteCategory } from "@/lib/types/database";

export function NoteModal({
  open,
  onClose,
  categories,
  note,
  defaultCategoryId,
  editable,
  onSaved,
  onCategoryAdded,
}: {
  open: boolean;
  onClose: () => void;
  categories: NoteCategory[];
  note?: Note | null;
  defaultCategoryId?: string | null;
  editable: boolean;
  onSaved: () => void;
  // Called (in addition to onSaved) whenever saving created a new
  // category, so the page's category list — and its tabs — pick it up too.
  onCategoryAdded?: () => void;
}) {
  const { wedding, user } = useWedding();
  const supabase = createClient();

  const [title, setTitle] = useState(note?.title ?? "");
  const [categoryMode, setCategoryMode] = useState<"existing" | "new">("existing");
  const [categoryId, setCategoryId] = useState(note?.category_id ?? defaultCategoryId ?? "");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [content, setContent] = useState(note?.content ?? "");
  const [photoPath, setPhotoPath] = useState(note?.photo_path ?? null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(
    note?.photo_path ? inspirationPhotoUrl(note.photo_path) : null
  );
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [addToInspiration, setAddToInspiration] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contentError, setContentError] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function reset() {
    setTitle(note?.title ?? "");
    setCategoryMode("existing");
    setCategoryId(note?.category_id ?? defaultCategoryId ?? "");
    setNewCategoryName("");
    setContent(note?.content ?? "");
    setPhotoPath(note?.photo_path ?? null);
    setPhotoFile(null);
    setPhotoPreviewUrl(note?.photo_path ? inspirationPhotoUrl(note.photo_path) : null);
    setRemovingPhoto(false);
    setAddToInspiration(false);
    setContentError(false);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoFile(file);
    setRemovingPhoto(false);
    setPhotoPreviewUrl(file ? URL.createObjectURL(file) : photoPath ? inspirationPhotoUrl(photoPath) : null);
  }

  function handleRemovePhoto() {
    setPhotoFile(null);
    setRemovingPhoto(true);
    setPhotoPreviewUrl(null);
  }

  async function handleSave() {
    if (!wedding || !user) return;
    if (!content.trim()) {
      setContentError(true);
      return;
    }
    setSaving(true);

    let resolvedCategoryId = categoryId || null;
    if (categoryMode === "new" && newCategoryName.trim()) {
      const name = newCategoryName.trim();
      const { data: categoryRow, error: categoryError } = await supabase
        .from("note_categories")
        .insert({ wedding_id: wedding.id, name, sort_order: categories.length })
        .select()
        .single();
      if (categoryRow) {
        resolvedCategoryId = categoryRow.id;
      } else if (categoryError) {
        // unique(wedding_id, name) — someone already added this exact name
        // (maybe in another tab) since this modal's categories were
        // loaded. Reuse that category instead of failing the whole save.
        const { data: existing } = await supabase
          .from("note_categories")
          .select("id")
          .eq("wedding_id", wedding.id)
          .eq("name", name)
          .maybeSingle();
        resolvedCategoryId = existing?.id ?? null;
      }
      onCategoryAdded?.();
    }

    // Resolve the photo before touching the note row: a fresh file replaces
    // (and removes) whatever was there, "Remove" clears it, and leaving both
    // alone keeps the existing one.
    let resolvedPhotoPath = photoPath;
    if (photoFile) {
      if (photoPath) {
        await supabase.storage.from(INSPIRATION_BUCKET).remove([photoPath]);
      }
      const path = `weddings/${wedding.id}/notes/${crypto.randomUUID()}-${sanitizeFilename(photoFile.name)}`;
      const { error: uploadError } = await supabase.storage.from(INSPIRATION_BUCKET).upload(path, photoFile);
      resolvedPhotoPath = uploadError ? photoPath : path;
    } else if (removingPhoto && photoPath) {
      await supabase.storage.from(INSPIRATION_BUCKET).remove([photoPath]);
      resolvedPhotoPath = null;
    }

    const payload = {
      wedding_id: wedding.id,
      category_id: resolvedCategoryId,
      title: title.trim() || null,
      content: content.trim(),
      photo_path: resolvedPhotoPath,
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

    if (addToInspiration && resolvedPhotoPath) {
      // A separate copy of the file, not the same storage row — so
      // removing the photo from this note (or from Inspiration) later
      // never affects the other.
      const originalFilename = resolvedPhotoPath.split("/").pop() ?? "photo.jpg";
      const inspirationPath = `weddings/${wedding.id}/inspiration/${crypto.randomUUID()}-${originalFilename}`;
      const { error: copyError } = await supabase.storage
        .from(INSPIRATION_BUCKET)
        .copy(resolvedPhotoPath, inspirationPath);
      if (!copyError) {
        await supabase.from("inspiration_photos").insert({
          wedding_id: wedding.id,
          category_id: null,
          storage_path: inspirationPath,
          caption: title.trim() || null,
          uploaded_by: user.id,
        });
      }
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
    if (note.photo_path) {
      await supabase.storage.from(INSPIRATION_BUCKET).remove([note.photo_path]);
    }
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

        <div>
          <span className="mb-1.5 block text-sm font-medium">Category</span>
          {editable && (
            <div className="mb-2 flex gap-2">
              {(["existing", "new"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCategoryMode(mode)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    categoryMode === mode
                      ? "border-primaryStrong bg-primary/10 text-primaryStrong"
                      : "border-line text-muted"
                  }`}
                >
                  {mode === "existing" ? "Choose existing" : "New category"}
                </button>
              ))}
            </div>
          )}
          {categoryMode === "existing" || !editable ? (
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={!editable}>
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Decor"
            />
          )}
        </div>

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

        <div>
          <span className="mb-1.5 block text-sm font-medium">Photo (optional)</span>
          {photoPreviewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- same
            // external-storage / unknown-dimensions reasoning as Inspiration's
            // MasonryGallery.
            <img src={photoPreviewUrl} alt="" className="mb-2 block max-h-56 w-full rounded-xl object-cover" />
          )}
          {editable && (
            <div className="flex items-center gap-2">
              <Input type="file" accept="image/*" onChange={handlePhotoChange} className="flex-1" />
              {photoPreviewUrl && (
                <Button type="button" variant="secondary" onClick={handleRemovePhoto}>
                  Remove
                </Button>
              )}
            </div>
          )}
          {editable && (photoFile || (photoPath && !removingPhoto)) && (
            <label className="mt-2 flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={addToInspiration}
                onChange={(e) => setAddToInspiration(e.target.checked)}
              />
              Also add this photo to the Inspiration board
            </label>
          )}
        </div>

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
