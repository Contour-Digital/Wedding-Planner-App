"use client";

import { useState } from "react";
import { PageHeader } from "@/components/nav/PageHeader";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useInspirationCategories } from "@/lib/hooks/useInspirationCategories";
import { useInspirationPhotos } from "@/lib/hooks/useInspirationPhotos";
import { Button } from "@/components/ui/Button";
import { CategoryTabs, type CategoryFilter } from "@/components/inspiration/CategoryTabs";
import { MasonryGallery } from "@/components/inspiration/MasonryGallery";
import { UploadPhotoModal } from "@/components/inspiration/UploadPhotoModal";
import { PhotoViewerModal } from "@/components/inspiration/PhotoViewerModal";
import { canEdit } from "@/lib/utils/permissions";
import type { InspirationPhoto } from "@/lib/types/database";

export default function InspirationPage() {
  const { wedding, role } = useWedding();
  const weddingId = wedding?.id;
  const { categories, refresh: refreshCategories } = useInspirationCategories(weddingId);
  const { photos, refresh: refreshPhotos } = useInspirationPhotos(weddingId);
  const editable = canEdit(role);

  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<InspirationPhoto | null>(null);

  const filtered = photos.filter((p) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "uncategorized") return p.category_id === null;
    return p.category_id === activeFilter;
  });

  const defaultUploadCategoryId =
    activeFilter !== "all" && activeFilter !== "uncategorized" ? activeFilter : null;

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

        <MasonryGallery photos={filtered} onSelect={setViewingPhoto} />
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
    </div>
  );
}
