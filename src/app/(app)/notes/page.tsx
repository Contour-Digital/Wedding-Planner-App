"use client";

import { useState } from "react";
import { PageHeader } from "@/components/nav/PageHeader";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useNoteCategories } from "@/lib/hooks/useNoteCategories";
import { useNotes } from "@/lib/hooks/useNotes";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { NoteCategoryTabs, type NoteCategoryFilter } from "@/components/notes/NoteCategoryTabs";
import { NoteModal } from "@/components/notes/NoteModal";
import { formatDate } from "@/lib/utils/date";
import { canEdit } from "@/lib/utils/permissions";
import type { Note } from "@/lib/types/database";

export default function NotesPage() {
  const { wedding, role } = useWedding();
  const weddingId = wedding?.id;
  const { categories, refresh: refreshCategories } = useNoteCategories(weddingId);
  const { notes, refresh: refreshNotes } = useNotes(weddingId);
  const editable = canEdit(role);

  const [activeFilter, setActiveFilter] = useState<NoteCategoryFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  // Bumped on every open so NoteModal (whose fields only seed from `note`
  // on mount) remounts fresh instead of showing whichever note's data
  // happened to be loaded first.
  const [modalKey, setModalKey] = useState(0);

  const filtered = notes.filter((n) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "uncategorized") return n.category_id === null;
    return n.category_id === activeFilter;
  });

  const defaultCategoryId = activeFilter !== "all" && activeFilter !== "uncategorized" ? activeFilter : null;

  function openAdd() {
    setEditingNote(null);
    setModalKey((k) => k + 1);
    setModalOpen(true);
  }

  function openEdit(note: Note) {
    setEditingNote(note);
    setModalKey((k) => k + 1);
    setModalOpen(true);
  }

  return (
    <div>
      <PageHeader title="Notes" />
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted">
            {notes.length} note{notes.length === 1 ? "" : "s"}
          </p>
          {editable && <Button onClick={openAdd}>+ Add note</Button>}
        </div>

        {weddingId && (
          <NoteCategoryTabs
            weddingId={weddingId}
            categories={categories}
            active={activeFilter}
            onSelect={setActiveFilter}
            editable={editable}
            onChanged={refreshCategories}
          />
        )}

        <div className="space-y-2">
          {filtered.map((note) => {
            const categoryName = categories.find((c) => c.id === note.category_id)?.name ?? "Uncategorized";
            return (
              <Card
                key={note.id}
                className="cursor-pointer space-y-1"
                onClick={() => openEdit(note)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{note.title || "Untitled"}</p>
                  <span className="shrink-0 text-xs text-muted">{formatDate(note.updated_at)}</span>
                </div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">{categoryName}</p>
                <p className="whitespace-pre-wrap text-sm text-ink">{note.content}</p>
              </Card>
            );
          })}
          {filtered.length === 0 && <p className="text-sm text-muted">No notes yet.</p>}
        </div>
      </div>

      <NoteModal
        key={modalKey}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        categories={categories}
        note={editingNote}
        defaultCategoryId={defaultCategoryId}
        editable={editable}
        onSaved={refreshNotes}
        onCategoryAdded={refreshCategories}
      />
    </div>
  );
}
