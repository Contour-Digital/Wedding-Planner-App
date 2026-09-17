"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { InspirationPhotoComment } from "@/lib/types/database";

// A plain list of notes attached to a photo, shown whenever it's opened —
// no pinning, no positioning, just "what we like about this one".
export function PhotoNotes({
  photoId,
  comments,
  editable,
  onChanged,
}: {
  photoId: string;
  comments: InspirationPhotoComment[];
  editable: boolean;
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function addNote() {
    if (!draft.trim()) return;
    setSaving(true);
    await supabase.from("inspiration_photo_comments").insert({ photo_id: photoId, comment: draft.trim() });
    setDraft("");
    setSaving(false);
    onChanged();
  }

  async function removeNote(id: string) {
    await supabase.from("inspiration_photo_comments").delete().eq("id", id);
    onChanged();
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        Notes{comments.length > 0 ? ` (${comments.length})` : ""}
      </p>

      {comments.length > 0 ? (
        <div className="space-y-1.5">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-2 rounded-lg bg-line/60 p-2 text-sm">
              <p className="text-ink">{c.comment}</p>
              {editable && (
                <button onClick={() => removeNote(c.id)} className="shrink-0 text-xs text-danger">
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        !editable && <p className="text-xs text-muted">No notes yet.</p>
      )}

      {editable && (
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addNote()}
            placeholder="Add a note…"
            className="flex-1"
          />
          <Button onClick={addNote} disabled={saving || !draft.trim()} className="shrink-0">
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
