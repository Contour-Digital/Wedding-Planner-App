"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import type { VendorDocument, VendorDocumentType } from "@/lib/types/database";

const DOC_TYPES: { value: VendorDocumentType; label: string }[] = [
  { value: "contract", label: "Contract" },
  { value: "invoice", label: "Invoice" },
  { value: "menu", label: "Menu" },
  { value: "seating_plan", label: "Seating plan" },
  { value: "quote", label: "Quote" },
  { value: "run_sheet", label: "Run sheet" },
  { value: "inspiration", label: "Inspiration" },
  { value: "other", label: "Other" },
];

const STORAGE_BUCKET = "vendor-documents";
// Signed URLs are generated on demand (not stored), so they only need to
// live long enough for the browser to open the new tab.
const SIGNED_URL_TTL_SECONDS = 600;

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

// Real files live in Supabase Storage at
// weddings/{wedding_id}/vendors/{vendor_id}/documents/{filename} (private
// bucket, RLS-scoped — see supabase/migrations/0001_vendor_documents_storage.sql),
// with storage_path recorded on the row. external_url stays supported for
// documents that are just a link (e.g. a vendor's own online contract).
export function DocumentManager({
  weddingId,
  vendorId,
  documents,
  onChanged,
}: {
  weddingId: string;
  vendorId: string;
  documents: VendorDocument[];
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState<"file" | "url">("file");
  const [type, setType] = useState<VendorDocumentType>("contract");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [titleError, setTitleError] = useState(false);
  const [sourceError, setSourceError] = useState(false);

  function resetDraft() {
    setType("contract");
    setTitle("");
    setUrl("");
    setFile(null);
    setError(null);
    setTitleError(false);
    setSourceError(false);
  }

  async function addDocument() {
    const missingTitle = !title.trim();
    const missingSource = mode === "url" ? !url.trim() : !file;
    if (missingTitle || missingSource) {
      setTitleError(missingTitle);
      setSourceError(missingSource);
      return;
    }
    setError(null);

    if (mode === "url") {
      setSaving(true);
      const { error: insertError } = await supabase.from("vendor_documents").insert({
        vendor_id: vendorId,
        type,
        title: title.trim(),
        external_url: url.trim(),
      });
      setSaving(false);
      if (insertError) {
        setError(insertError.message);
        return;
      }
    } else {
      if (!file) return;
      setSaving(true);
      const path = `weddings/${weddingId}/vendors/${vendorId}/documents/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
      const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file);
      if (uploadError) {
        setSaving(false);
        setError(uploadError.message);
        return;
      }
      const { error: insertError } = await supabase.from("vendor_documents").insert({
        vendor_id: vendorId,
        type,
        title: title.trim(),
        storage_path: path,
      });
      setSaving(false);
      if (insertError) {
        // Don't leave an orphaned file behind if the row insert failed.
        await supabase.storage.from(STORAGE_BUCKET).remove([path]);
        setError(insertError.message);
        return;
      }
    }

    resetDraft();
    setAdding(false);
    onChanged();
  }

  async function removeDocument(doc: VendorDocument) {
    if (doc.storage_path) {
      await supabase.storage.from(STORAGE_BUCKET).remove([doc.storage_path]);
    }
    await supabase.from("vendor_documents").delete().eq("id", doc.id);
    onChanged();
  }

  async function openDocument(doc: VendorDocument) {
    if (doc.external_url) {
      window.open(doc.external_url, "_blank", "noreferrer");
      return;
    }
    if (!doc.storage_path) return;
    setOpeningId(doc.id);
    const { data, error: signError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(doc.storage_path, SIGNED_URL_TTL_SECONDS);
    setOpeningId(null);
    if (signError || !data?.signedUrl) {
      setError(signError?.message ?? "Couldn't open that document.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noreferrer");
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Documents & links</h3>
        <Button
          variant="secondary"
          onClick={() => {
            setAdding((v) => !v);
            resetDraft();
          }}
        >
          {adding ? "Cancel" : "+ Add document"}
        </Button>
      </div>

      {adding && (
        <div className="space-y-2 rounded-xl border border-line p-3">
          <div className="flex gap-2">
            {(["file", "url"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setSourceError(false);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  mode === m ? "border-primaryStrong bg-primary/10 text-primaryStrong" : "border-line text-muted"
                }`}
              >
                {m === "file" ? "Upload a file" : "Link to a URL"}
              </button>
            ))}
          </div>
          <Select value={type} onChange={(e) => setType(e.target.value as VendorDocumentType)}>
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <div>
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError(false);
              }}
              className={titleError ? "border-danger focus:border-danger focus:ring-danger/20" : undefined}
            />
            {titleError && <p className="mt-1 text-xs text-danger">Required</p>}
          </div>
          <div>
            {mode === "file" ? (
              <Input
                type="file"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  if (sourceError) setSourceError(false);
                }}
              />
            ) : (
              <Input
                placeholder="Link (URL)"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (sourceError) setSourceError(false);
                }}
                className={sourceError ? "border-danger focus:border-danger focus:ring-danger/20" : undefined}
              />
            )}
            {sourceError && (
              <p className="mt-1 text-xs text-danger">{mode === "file" ? "Choose a file" : "Required"}</p>
            )}
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button fullWidth onClick={addDocument} disabled={saving}>
            {saving ? "Saving…" : "Save document"}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {documents.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-xl border border-line p-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {DOC_TYPES.find((t) => t.value === d.type)?.label}
              </p>
              <button
                onClick={() => openDocument(d)}
                disabled={openingId === d.id}
                className="text-left text-sm font-medium text-primaryStrong underline disabled:opacity-50"
              >
                {openingId === d.id ? "Opening…" : d.title}
              </button>
            </div>
            <button onClick={() => removeDocument(d)} className="text-xs text-danger">
              Remove
            </button>
          </div>
        ))}
        {documents.length === 0 && !adding && <p className="text-sm text-muted">No documents yet.</p>}
      </div>
    </Card>
  );
}
