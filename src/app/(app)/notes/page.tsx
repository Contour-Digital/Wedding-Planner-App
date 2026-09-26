"use client";

import { useState } from "react";
import { PageHeader } from "@/components/nav/PageHeader";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useNoteCategories } from "@/lib/hooks/useNoteCategories";
import { useNotes } from "@/lib/hooks/useNotes";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AddNoteCategoryForm } from "@/components/notes/AddNoteCategoryForm";
import { NoteModal } from "@/components/notes/NoteModal";
import { NoteViewModal } from "@/components/notes/NoteViewModal";
import { formatDate } from "@/lib/utils/date";
import { canEdit } from "@/lib/utils/permissions";
import type { Note, NoteCategory } from "@/lib/types/database";

export default function NotesPage() {
  const { wedding, role } = useWedding();
  const weddingId = wedding?.id;
  const { categories, refresh: refreshCategories } = useNoteCategories(weddingId);
  const { notes, refresh: refreshNotes } = useNotes(weddingId);
  const supabase = createClient();
  const editable = canEdit(role);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [addCategoryId, setAddCategoryId] = useState<string | null>(null);
  // Bumped on every open so NoteModal (whose fields only seed from `note`
  // on mount) remounts fresh instead of showing whichever note's data
  // happened to be loaded first.
  const [modalKey, setModalKey] = useState(0);
  const [removingCategory, setRemovingCategory] = useState<NoteCategory | null>(null);

  // Grouped by category instead of shown as a label on every note — real
  // categories always get a section (even an empty one, so it stays
  // visible to remove), while "Uncategorized" isn't a row of its own
  // (ON DELETE SET NULL when a category goes away) so it only shows up
  // once something actually lands there.
  const groups = [
    ...categories.map((category) => ({
      key: category.id,
      label: category.name,
      category,
      notes: notes.filter((n) => n.category_id === category.id),
    })),
    {
      key: "uncategorized",
      label: "Uncategorized",
      category: null as NoteCategory | null,
      notes: notes.filter((n) => n.category_id === null),
    },
  ].filter((group) => group.category !== null || group.notes.length > 0);

  function openAdd(categoryId: string | null) {
    setEditingNote(null);
    setAddCategoryId(categoryId);
    setModalKey((k) => k + 1);
    setModalOpen(true);
  }

  function openEdit(note: Note) {
    setViewingNote(null);
    setEditingNote(note);
    setModalKey((k) => k + 1);
    setModalOpen(true);
  }

  async function removeCategory(category: NoteCategory) {
    setRemovingCategory(null);
    await supabase.from("note_categories").delete().eq("id", category.id);
    refreshCategories();
  }

  return (
    <div>
      <PageHeader title="Notes" />
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted">
            {notes.length} note{notes.length === 1 ? "" : "s"}
          </p>
          {editable && <Button onClick={() => openAdd(null)}>+ Add note</Button>}
        </div>

        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{group.label}</h3>
                {editable && group.category && (
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      onClick={() => openAdd(group.category!.id)}
                      className="text-xs font-medium text-primaryStrong"
                    >
                      + Add note
                    </button>
                    <button onClick={() => setRemovingCategory(group.category)} className="text-xs text-danger">
                      Remove category
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {group.notes.map((note) => (
                  <Card
                    key={note.id}
                    className="flex cursor-pointer items-center justify-between gap-2"
                    onClick={() => setViewingNote(note)}
                  >
                    <p className="text-sm font-medium">{note.title || "Untitled"}</p>
                    <span className="shrink-0 text-xs text-muted">{formatDate(note.updated_at)}</span>
                  </Card>
                ))}
                {group.notes.length === 0 && <p className="text-xs text-muted">No notes in this category yet.</p>}
              </div>
            </div>
          ))}
          {groups.length === 0 && <p className="text-sm text-muted">No notes yet.</p>}
        </div>

        {editable && (
          <Card className="space-y-3">
            <h3 className="font-display text-lg font-semibold">Add category</h3>
            <AddNoteCategoryForm categories={categories} onAdded={refreshCategories} />
          </Card>
        )}
      </div>

      <NoteModal
        key={modalKey}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        categories={categories}
        note={editingNote}
        defaultCategoryId={addCategoryId}
        editable={editable}
        onSaved={refreshNotes}
        onCategoryAdded={refreshCategories}
      />

      <NoteViewModal
        note={viewingNote}
        categories={categories}
        editable={editable}
        onClose={() => setViewingNote(null)}
        onEdit={() => viewingNote && openEdit(viewingNote)}
      />

      <ConfirmDialog
        open={removingCategory !== null}
        title="Remove category"
        message={
          removingCategory
            ? `Remove "${removingCategory.name}"? Its notes move to Uncategorized — nothing is deleted.`
            : ""
        }
        onConfirm={() => removingCategory && removeCategory(removingCategory)}
        onCancel={() => setRemovingCategory(null)}
      />
    </div>
  );
}
