"use client";

import { useState } from "react";
import { PageHeader } from "@/components/nav/PageHeader";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useInspirationCategories } from "@/lib/hooks/useInspirationCategories";
import { useInspirationPhotos } from "@/lib/hooks/useInspirationPhotos";
import { useNoteCategories } from "@/lib/hooks/useNoteCategories";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { CategoryTabs, type CategoryFilter } from "@/components/inspiration/CategoryTabs";
import { MasonryGallery } from "@/components/inspiration/MasonryGallery";
import { UploadPhotoModal } from "@/components/inspiration/UploadPhotoModal";
import { PhotoViewerModal } from "@/components/inspiration/PhotoViewerModal";
import { NoteModal } from "@/components/notes/NoteModal";
import { NoteViewModal } from "@/components/notes/NoteViewModal";
import { canEdit } from "@/lib/utils/permissions";
import type { InspirationPhoto, Note } from "@/lib/types/database";

export default function InspirationPage() {
  const { wedding, role } = useWedding();
  const weddingId = wedding?.id;
  const { categories, refresh: refreshCategories } = useInspirationCategories(weddingId);
  const { photos, refresh: refreshPhotos } = useInspirationPhotos(weddingId);
  const { categories: noteCategories, refresh: refreshNoteCategories } = useNoteCategories(weddingId);
  const supabase = createClient();
  const editable = canEdit(role);

  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<InspirationPhoto | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  // Bumped on every open so NoteModal (whose fields only seed from `note`
  // on mount) remounts fresh instead of showing whichever note's data
  // happened to be loaded first.
  const [noteModalKey, setNoteModalKey] = useState(0);

  const filtered = photos.filter((p) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "uncategorized") return p.category_id === null;
    return p.category_id === activeFilter;
  });

  const defaultUploadCategoryId =
    activeFilter !== "all" && activeFilter !== "uncategorized" ? activeFilter : null;

  // A photo added from a note (via "Also add this photo to the Inspiration
  // board" on NoteModal) opens that note instead of the plain photo viewer —
  // falls back to the normal viewer if the note's since been deleted
  // (source_note_id goes null via ON DELETE SET NULL, so this is rare, not
  // an error case).
  async function handleSelectPhoto(photo: InspirationPhoto) {
    if (photo.source_note_id) {
      const { data } = await supabase.from("notes").select("*").eq("id", photo.source_note_id).maybeSingle();
      if (data) {
        setViewingNote(data);
        return;
      }
    }
    setViewingPhoto(photo);
  }

  function openEditNote(note: Note) {
    setViewingNote(null);
    setEditingNote(note);
    setNoteModalKey((k) => k + 1);
    setNoteModalOpen(true);
  }

  return (
    <div>
      <PageHeader title="Inspiration" />
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted">
            {photos.length} photo{photos.length === 1 ? "" : "s"}
          </p>
          {editable && <Button onClick={() => setUploadOpen(true)}>+ Add photos</Button>}
        </div>

        {weddingId && (
          <CategoryTabs
            weddingId={weddingId}
            categories={categories}
            active={activeFilter}
            onSelect={setActiveFilter}
            editable={editable}
            onChanged={refreshCategories}
          />
        )}

        <MasonryGallery photos={filtered} onSelect={handleSelectPhoto} />
      </div>

      {editable && (
        <UploadPhotoModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          categories={categories}
          defaultCategoryId={defaultUploadCategoryId}
          onSaved={refreshPhotos}
        />
      )}

      <PhotoViewerModal
        photo={viewingPhoto}
        categories={categories}
        editable={editable}
        onClose={() => setViewingPhoto(null)}
        onChanged={refreshPhotos}
      />

      <NoteViewModal
        note={viewingNote}
        categories={noteCategories}
        editable={editable}
        onClose={() => setViewingNote(null)}
        onEdit={() => viewingNote && openEditNote(viewingNote)}
      />

      <NoteModal
        key={noteModalKey}
        open={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        categories={noteCategories}
        note={editingNote}
        editable={editable}
        onSaved={() => {}}
        onCategoryAdded={refreshNoteCategories}
      />
    </div>
  );
}
