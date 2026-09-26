"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { logActivity } from "@/lib/activity/logActivity";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { INSPIRATION_BUCKET, sanitizeFilename } from "@/lib/utils/inspirationPhotos";
import type { InspirationCategory } from "@/lib/types/database";

export function UploadPhotoModal({
  open,
  onClose,
  categories,
  defaultCategoryId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  categories: InspirationCategory[];
  defaultCategoryId: string | null;
  onSaved: () => void;
}) {
  const { wedding, user } = useWedding();
  const supabase = createClient();
  const [categoryId, setCategoryId] = useState(defaultCategoryId ?? "");
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setCategoryId(defaultCategoryId ?? "");
    setCaption("");
    setFiles(null);
    setError(null);
  }

  async function handleSave() {
    if (!wedding || !user || !files || files.length === 0) return;
    setSaving(true);
    setError(null);

    let uploaded = 0;
    for (const file of Array.from(files)) {
      const path = `weddings/${wedding.id}/inspiration/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
      const { error: uploadError } = await supabase.storage.from(INSPIRATION_BUCKET).upload(path, file);
      if (uploadError) {
        setError(uploadError.message);
        continue;
      }
      const { error: insertError } = await supabase.from("inspiration_photos").insert({
        wedding_id: wedding.id,
        category_id: categoryId || null,
        storage_path: path,
        caption: caption.trim() || null,
        uploaded_by: user.id,
      });
      if (insertError) {
        // Don't leave an orphaned file behind if the row insert failed.
        await supabase.storage.from(INSPIRATION_BUCKET).remove([path]);
        setError(insertError.message);
        continue;
      }
      uploaded += 1;
    }

    if (uploaded > 0) {
      await logActivity(supabase, {
        weddingId: wedding.id,
        userId: user.id,
        actionType: "inspiration.photo_added",
        description: uploaded === 1 ? "Added an inspiration photo." : `Added ${uploaded} inspiration photos.`,
        entityType: "inspiration_photo",
      });
    }

    setSaving(false);
    if (uploaded > 0) {
      reset();
      onSaved();
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add photos"
    >
      <div className="space-y-4">
        <Field label="Category">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Caption" hint="Optional — applies to every photo you add here">
          <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Loved this florals moment" />
        </Field>
        <Field label="Photos">
          <Input type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files)} />
        </Field>
        {error && <p className="text-xs text-danger">{error}</p>}
        <Button fullWidth onClick={handleSave} disabled={saving || !files || files.length === 0}>
          {saving ? "Uploading…" : "Upload"}
        </Button>
      </div>
    </Modal>
  );
}
