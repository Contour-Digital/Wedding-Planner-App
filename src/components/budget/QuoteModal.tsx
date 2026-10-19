"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { logActivity } from "@/lib/activity/logActivity";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import type { ExpenseCategory, ExpenseQuote } from "@/lib/types/database";
import type { VendorWithRelations } from "@/lib/hooks/useVendors";

export function QuoteModal({
  open,
  onClose,
  categories,
  vendors,
  quote,
  defaultCategoryId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  categories: ExpenseCategory[];
  vendors: VendorWithRelations[];
  quote?: ExpenseQuote | null;
  // The category whose "+ Add quote" was tapped; ignored when editing.
  defaultCategoryId?: string | null;
  onSaved: () => void;
}) {
  const { wedding, user } = useWedding();
  const supabase = createClient();

  // Same choice as the expense form, minus "No vendor": a quote is always
  // from someone. An older quote saved before it was linked to a vendor
  // opens in "Create new" with its name filled in.
  const [vendorMode, setVendorMode] = useState<"existing" | "new">(
    quote && !quote.vendor_id ? "new" : vendors.length > 0 ? "existing" : "new"
  );
  const [vendorId, setVendorId] = useState(quote?.vendor_id ?? "");
  const [newVendorName, setNewVendorName] = useState(quote && !quote.vendor_id ? quote.vendor_name : "");
  const [newVendorContactName, setNewVendorContactName] = useState("");
  const [newVendorContactEmail, setNewVendorContactEmail] = useState("");
  const [newVendorContactPhone, setNewVendorContactPhone] = useState("");
  const [categoryId, setCategoryId] = useState(
    quote?.category_id ?? defaultCategoryId ?? categories[0]?.id ?? ""
  );
  const [amount, setAmount] = useState(quote ? String(quote.amount) : "");
  const [notes, setNotes] = useState(quote?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [vendorError, setVendorError] = useState(false);
  const [amountError, setAmountError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSave() {
    if (!wedding || !user) return;
    const missingVendor = vendorMode === "existing" ? !vendorId : !newVendorName.trim();
    const missingAmount = !amount;
    if (missingVendor || missingAmount) {
      setVendorError(missingVendor);
      setAmountError(missingAmount);
      return;
    }
    setSaving(true);

    let resolvedVendorId: string | null = null;
    let resolvedVendorName = "";
    if (vendorMode === "existing") {
      resolvedVendorId = vendorId;
      resolvedVendorName = vendors.find((v) => v.id === vendorId)?.name ?? "";
    } else {
      resolvedVendorName = newVendorName.trim();
      const { data: vendorRow } = await supabase
        .from("vendors")
        // They've sent a price but aren't booked yet; accepting the quote
        // later is what moves them to Booked.
        .insert({ wedding_id: wedding.id, name: resolvedVendorName, status: "quote_received" })
        .select()
        .single();
      resolvedVendorId = vendorRow?.id ?? null;

      if (resolvedVendorId && newVendorContactName.trim()) {
        await supabase.from("vendor_contacts").insert({
          vendor_id: resolvedVendorId,
          name: newVendorContactName.trim(),
          email: newVendorContactEmail.trim() || null,
          phone: newVendorContactPhone.trim() || null,
        });
      }
    }

    const payload = {
      wedding_id: wedding.id,
      category_id: categoryId || null,
      vendor_id: resolvedVendorId,
      vendor_name: resolvedVendorName,
      amount: Number(amount) || 0,
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let quoteId = quote?.id;
    if (quoteId) {
      await supabase.from("expense_quotes").update(payload).eq("id", quoteId);
    } else {
      const { data } = await supabase.from("expense_quotes").insert(payload).select().single();
      quoteId = data?.id;
    }

    await logActivity(supabase, {
      weddingId: wedding.id,
      userId: user.id,
      actionType: quote ? "quote.updated" : "quote.created",
      description: quote ? `Updated the quote from ${payload.vendor_name}.` : `Added a quote from ${payload.vendor_name}.`,
      entityType: "expense_quote",
      entityId: quoteId,
    });

    setSaving(false);
    onSaved();
    onClose();
  }

  async function handleDelete() {
    if (!quote) return;
    setConfirmDelete(false);
    await supabase.from("expense_quotes").delete().eq("id", quote.id);
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={quote ? "Edit quote" : "Add quote"}>
      <div className="space-y-4">
        <div>
          <span className="mb-1.5 block text-sm font-medium">Vendor</span>
          <div className="mb-2 flex gap-2">
            {(["existing", "new"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setVendorMode(mode);
                  setVendorError(false);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  vendorMode === mode ? "border-primaryStrong bg-primary/10 text-primaryStrong" : "border-line text-muted"
                }`}
              >
                {mode === "existing" ? "Select existing" : "Create new"}
              </button>
            ))}
          </div>
          {vendorMode === "existing" ? (
            <Select
              value={vendorId}
              onChange={(e) => {
                setVendorId(e.target.value);
                if (vendorError) setVendorError(false);
              }}
            >
              <option value="">Choose a vendor…</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
          ) : (
            <div className="space-y-2">
              <Input
                value={newVendorName}
                onChange={(e) => {
                  setNewVendorName(e.target.value);
                  if (vendorError) setVendorError(false);
                }}
                placeholder="Vendor / business name"
                className={vendorError ? "border-danger" : undefined}
              />
              <p className="text-xs text-muted">Contact details (optional) — can also be added later on the vendor&apos;s page</p>
              <Input
                value={newVendorContactName}
                onChange={(e) => setNewVendorContactName(e.target.value)}
                placeholder="Contact name"
              />
              <Input
                type="email"
                value={newVendorContactEmail}
                onChange={(e) => setNewVendorContactEmail(e.target.value)}
                placeholder="Contact email"
              />
              <Input
                type="tel"
                value={newVendorContactPhone}
                onChange={(e) => setNewVendorContactPhone(e.target.value)}
                placeholder="Contact phone"
              />
            </div>
          )}
          {vendorError && <span className="mt-1.5 block text-xs text-danger">Required</span>}
        </div>

        <Field label="Category">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Quoted amount" error={amountError}>
          <Input
            type="number"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (amountError) setAmountError(false);
            }}
          />
        </Field>

        <Field label="Notes" hint="What's included, how long it's valid, anything that sets it apart.">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <Button fullWidth onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save quote"}
        </Button>
        {quote && (
          <Button fullWidth variant="ghost" className="text-danger" onClick={() => setConfirmDelete(true)}>
            Delete quote
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete quote"
        message={`Delete the quote from ${quote?.vendor_name ?? "this vendor"}? Declining it instead keeps it for reference.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </Modal>
  );
}
