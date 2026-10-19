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

  const [vendorName, setVendorName] = useState(quote?.vendor_name ?? "");
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
    const missingVendor = !vendorName.trim();
    const missingAmount = !amount;
    if (missingVendor || missingAmount) {
      setVendorError(missingVendor);
      setAmountError(missingAmount);
      return;
    }
    setSaving(true);

    // Typing the name of a vendor already on the Vendors page links the
    // quote to it, so accepting it later books that vendor rather than
    // creating a duplicate.
    const trimmed = vendorName.trim();
    const match = vendors.find((v) => v.name.trim().toLowerCase() === trimmed.toLowerCase());
    const payload = {
      wedding_id: wedding.id,
      category_id: categoryId || null,
      vendor_id: match?.id ?? null,
      vendor_name: match?.name ?? trimmed,
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
        <Field label="Vendor" error={vendorError}>
          <Input
            value={vendorName}
            list="quote-vendor-options"
            onChange={(e) => {
              setVendorName(e.target.value);
              if (vendorError) setVendorError(false);
            }}
            placeholder="Business name"
          />
        </Field>
        <datalist id="quote-vendor-options">
          {vendors.map((v) => (
            <option key={v.id} value={v.name} />
          ))}
        </datalist>

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
