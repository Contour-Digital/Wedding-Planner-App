"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { inspirationPhotoUrl } from "@/lib/utils/inspirationPhotos";
import { formatDate } from "@/lib/utils/date";
import { linkifyText } from "@/lib/utils/linkify";
import type { Note, NoteCategory } from "@/lib/types/database";

export function NoteViewModal({
  note,
  categories,
  editable,
  onClose,
  onEdit,
}: {
  note: Note | null;
  categories: NoteCategory[];
  editable: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const categoryName = note ? categories.find((c) => c.id === note.category_id)?.name ?? "Uncategorized" : "";

  return (
    <Modal open={note !== null} onClose={onClose} title={note?.title || "Untitled"}>
      {note && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 text-xs text-muted">
            <span className="font-medium uppercase tracking-wide">{categoryName}</span>
            <span>Updated {formatDate(note.updated_at)}</span>
          </div>

          {note.photo_path && (
            // eslint-disable-next-line @next/next/no-img-element -- same
            // external-storage / unknown-dimensions reasoning as Inspiration's
            // MasonryGallery.
            <img src={inspirationPhotoUrl(note.photo_path)} alt="" className="block w-full rounded-xl" />
          )}

          <p className="whitespace-pre-wrap text-sm text-ink">{linkifyText(note.content)}</p>

          {editable && (
            <Button fullWidth onClick={onEdit}>
              Edit note
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
}
