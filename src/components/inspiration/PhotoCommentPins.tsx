"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { InspirationPhotoComment } from "@/lib/types/database";

// Absolutely-positioned overlay sitting on top of the photo (parent must be
// `relative`). Editors click anywhere on the photo to drop a new pin at
// that spot; clicking an existing pin opens its note instead of starting a
// new one, via stopPropagation. Visibility of the whole layer is controlled
// by the parent (the "Show/hide comments" toggle) so the underlying photo
// is never obstructed unless you ask for it.
export function PhotoCommentPins({
  photoId,
  comments,
  editable,
  visible,
  onChanged,
}: {
  photoId: string;
  comments: InspirationPhotoComment[];
  editable: boolean;
  visible: boolean;
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [openPinId, setOpenPinId] = useState<string | null>(null);
  const [draftPin, setDraftPin] = useState<{ x: number; y: number } | null>(null);
  const [draftText, setDraftText] = useState("");
  const [saving, setSaving] = useState(false);

  if (!visible) return null;

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!editable) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOpenPinId(null);
    setDraftPin({ x, y });
    setDraftText("");
  }

  async function saveDraftPin() {
    if (!draftPin || !draftText.trim()) return;
    setSaving(true);
    await supabase.from("inspiration_photo_comments").insert({
      photo_id: photoId,
      x: draftPin.x,
      y: draftPin.y,
      comment: draftText.trim(),
    });
    setSaving(false);
    setDraftPin(null);
    setDraftText("");
    onChanged();
  }

  async function deleteComment(id: string) {
    setOpenPinId(null);
    await supabase.from("inspiration_photo_comments").delete().eq("id", id);
    onChanged();
  }

  return (
    <div
      className={`absolute inset-0 ${editable ? "cursor-crosshair" : ""}`}
      onClick={handleOverlayClick}
    >
      {comments.map((c) => (
        <Pin
          key={c.id}
          comment={c}
          open={openPinId === c.id}
          editable={editable}
          onToggle={() => setOpenPinId((id) => (id === c.id ? null : c.id))}
          onDelete={() => deleteComment(c.id)}
        />
      ))}

      {draftPin && (
        <div
          className="absolute z-20 w-48 -translate-x-1/2 rounded-xl border border-line bg-white p-2 shadow-lg"
          style={{ left: `${draftPin.x}%`, top: `${draftPin.y}%` }}
          onClick={(e) => e.stopPropagation()}
        >
          <Input
            autoFocus
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="Add a note…"
            className="mb-2 !min-h-0 py-1.5 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setDraftPin(null)} className="text-xs text-muted">
              Cancel
            </button>
            <Button
              onClick={saveDraftPin}
              disabled={saving || !draftText.trim()}
              className="!min-h-0 px-2.5 py-1 text-xs"
            >
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Pin({
  comment,
  open,
  editable,
  onToggle,
  onDelete,
}: {
  comment: InspirationPhotoComment;
  open: boolean;
  editable: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${comment.x}%`, top: `${comment.y}%` }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onToggle}
        aria-label="View comment"
        className="h-5 w-5 rounded-full border-2 border-white bg-primaryStrong shadow"
      />
      {open && (
        <div className="absolute left-1/2 top-full z-20 mt-1 w-48 -translate-x-1/2 rounded-xl border border-line bg-white p-2 text-xs shadow-lg">
          <p className="text-ink">{comment.comment}</p>
          {editable && (
            <button onClick={onDelete} className="mt-1 font-medium text-danger">
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}
