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

// v1 stores a link (external_url). storage_path is reserved for the
// Supabase Storage upload flow described in the architecture doc — swapping
// this component to a real file picker later doesn't change its shape.
export function DocumentManager({
  vendorId,
  documents,
  onChanged,
}: {
  vendorId: string;
  documents: VendorDocument[];
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{ type: VendorDocumentType; title: string; url: string }>({
    type: "contract",
    title: "",
    url: "",
  });

  async function addDocument() {
    if (!draft.title.trim() || !draft.url.trim()) return;
    await supabase.from("vendor_documents").insert({
      vendor_id: vendorId,
      type: draft.type,
      title: draft.title.trim(),
      external_url: draft.url.trim(),
    });
    setDraft({ type: "contract", title: "", url: "" });
    setAdding(false);
    onChanged();
  }

  async function removeDocument(id: string) {
    await supabase.from("vendor_documents").delete().eq("id", id);
    onChanged();
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Documents & links</h3>
        <Button variant="secondary" onClick={() => setAdding((v) => !v)}>
          {adding ? "Cancel" : "+ Add document"}
        </Button>
      </div>

      {adding && (
        <div className="space-y-2 rounded-xl border border-line p-3">
          <Select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as VendorDocumentType })}>
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <Input placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <Input placeholder="Link (URL)" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
          <Button fullWidth onClick={addDocument}>
            Save document
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
              <a
                href={d.external_url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-primaryStrong underline"
              >
                {d.title}
              </a>
            </div>
            <button onClick={() => removeDocument(d.id)} className="text-xs text-danger">
              Remove
            </button>
          </div>
        ))}
        {documents.length === 0 && !adding && <p className="text-sm text-muted">No documents yet.</p>}
      </div>
    </Card>
  );
}
