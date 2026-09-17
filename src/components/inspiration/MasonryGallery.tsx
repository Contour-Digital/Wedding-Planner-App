"use client";

import { inspirationPhotoUrl } from "@/lib/utils/inspirationPhotos";
import type { InspirationPhoto } from "@/lib/types/database";

// Plain CSS multi-column masonry (no layout library) — each item is
// break-inside-avoid so a photo never gets split across columns, and
// natural image aspect ratios (no fixed height) are what actually gives a
// masonry gallery its staggered look.
export function MasonryGallery({
  photos,
  onSelect,
}: {
  photos: InspirationPhoto[];
  onSelect: (photo: InspirationPhoto) => void;
}) {
  if (photos.length === 0) {
    return <p className="text-sm text-muted">No photos here yet.</p>;
  }

  return (
    <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
      {photos.map((photo) => (
        <button
          key={photo.id}
          onClick={() => onSelect(photo)}
          className="mb-3 block w-full break-inside-avoid overflow-hidden rounded-xl border border-line bg-line"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- external
              Supabase Storage URLs in a masonry grid of natural-aspect-ratio
              images; next/image needs known dimensions or a sized parent,
              neither of which fits a masonry layout, and would also need
              remotePatterns configured for a per-project storage domain. */}
          <img src={inspirationPhotoUrl(photo.storage_path)} alt={photo.caption ?? ""} loading="lazy" className="block w-full" />
        </button>
      ))}
    </div>
  );
}
