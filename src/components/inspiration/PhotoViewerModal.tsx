"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { logActivity } from "@/lib/activity/logActivity";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { INSPIRATION_BUCKET, inspirationPhotoUrl } from "@/lib/utils/inspirationPhotos";
import type { InspirationCategory, InspirationPhoto } from "@/lib/types/database";

export function PhotoViewerModal({
  photo,
  categories,
  editable,
  onClose,
  onChanged,
}: {
  photo: InspirationPhoto | null;
  categories: InspirationCategory[];
  editable: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { wedding, user } = useWedding();
  const supabase = createClient();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const categoryName = photo ? categories.find((c) => c.id === photo.category_id)?.name ?? "Uncategorized" : "";

  async function handleDelete() {
    if (!photo) return;
    setConfirmingDelete(false);
    await supabase.storage.from(INSPIRATION_BUCKET).remove([photo.storage_path]);
    await supabase.from("inspiration_photos").delete().eq("id", photo.id);
    if (wedding && user) {
      await logActivity(supabase, {
        weddingId: wedding.id,
        userId: user.id,
        actionType: "inspiration.photo_removed",
        description: "Removed an inspiration photo.",
        entityType: "inspiration_photo",
        entityId: photo.id,
      });
    }
    onChanged();
    onClose();
  }

  return (
    <Modal open={photo !== null} onClose={onClose} title={categoryName}>
      {photo && (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- same
              external-storage / unknown-dimensions reasoning as MasonryGallery. */}
          <img
            src={inspirationPhotoUrl(photo.storage_path)}
            alt={photo.caption ?? ""}
            className="w-full rounded-xl"
          />
          {photo.caption && <p className="text-sm text-ink">{photo.caption}</p>}
          {editable && (
            <button onClick={() => setConfirmingDelete(true)} className="text-sm font-medium text-danger">
              Remove photo
            </button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirmingDelete}
        title="Remove photo"
        message="Remove this photo from your inspiration board?"
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </Modal>
  );
}
