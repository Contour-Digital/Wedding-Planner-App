"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { logActivity } from "@/lib/activity/logActivity";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import type { ExpenseCategory, ExpenseInstalment, ReminderDays } from "@/lib/types/database";
import type { ExpenseWithInstalments } from "@/lib/types/domain";
import type { VendorWithRelations } from "@/lib/hooks/useVendors";

interface DraftInstalment {
  id?: string;
  amount: string;
  due_date: string;
  paid: boolean;
  reminder_days: string;
  label: string;
}

const REMINDER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "None" },
  { value: "3", label: "3 days before" },
  { value: "7", label: "7 days before" },
  { value: "14", label: "14 days before" },
  { value: "30", label: "30 days before" },
];

function toDraft(i: ExpenseInstalment): DraftInstalment {
  return {
    id: i.id,
    amount: String(i.amount),
    due_date: i.due_date ?? "",
    paid: i.paid,
    reminder_days: i.reminder_days != null ? String(i.reminder_days) : "",
    label: i.label ?? "",
  };
}

export function ExpenseModal({
  open,
  onClose,
  categories,
  vendors,
  expense,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  categories: ExpenseCategory[];
  vendors: VendorWithRelations[];
  expense?: ExpenseWithInstalments | null;
  onSaved: () => void;
}) {
  const { wedding, user } = useWedding();
  const supabase = createClient();

  const [name, setName] = useState(expense?.name ?? "");
  const [categoryId, setCategoryId] = useState(expense?.category_id ?? categories[0]?.id ?? "");
  const [vendorMode, setVendorMode] = useState<"none" | "existing" | "new">(
    expense?.vendor_id ? "existing" : "none"
  );
  const [vendorId, setVendorId] = useState(expense?.vendor_id ?? "");
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorContactName, setNewVendorContactName] = useState("");
  const [newVendorContactEmail, setNewVendorContactEmail] = useState("");
  const [newVendorContactPhone, setNewVendorContactPhone] = useState("");
  const [totalAmount, setTotalAmount] = useState(expense ? String(expense.total_amount) : "");
  const [depositAmount, setDepositAmount] = useState(expense ? String(expense.deposit_amount) : "0");
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [instalments, setInstalments] = useState<DraftInstalment[]>(
    expense?.instalments.map(toDraft) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [totalAmountError, setTotalAmountError] = useState(false);

  function addInstalment() {
    setInstalments([...instalments, { amount: "", due_date: "", paid: false, reminder_days: "", label: "" }]);
  }

  function updateInstalment(index: number, patch: Partial<DraftInstalment>) {
    setInstalments(instalments.map((i, idx) => (idx === index ? { ...i, ...patch } : i)));
  }

  function removeInstalment(index: number) {
    setInstalments(instalments.filter((_, idx) => idx !== index));
  }

  async function handleSave() {
    if (!wedding || !user) return;
    const missingName = !name.trim();
    const missingTotal = !totalAmount;
    if (missingName || missingTotal) {
      setNameError(missingName);
      setTotalAmountError(missingTotal);
      return;
    }
    setSaving(true);

    let resolvedVendorId: string | null = null;
    if (vendorMode === "existing") resolvedVendorId = vendorId || null;
    if (vendorMode === "new" && newVendorName.trim()) {
      const { data: vendorRow } = await supabase
        .from("vendors")
        // Being added specifically to cover a new expense implies the
        // vendor is already locked in, not still being considered.
        .insert({ wedding_id: wedding.id, name: newVendorName.trim(), status: "booked" })
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
      name: name.trim(),
      total_amount: Number(totalAmount) || 0,
      deposit_amount: Number(depositAmount) || 0,
      notes: notes.trim() || null,
    };

    let expenseId = expense?.id;
    if (expenseId) {
      await supabase.from("expenses").update(payload).eq("id", expenseId);
    } else {
      const { data } = await supabase.from("expenses").insert(payload).select().single();
      expenseId = data?.id;
    }

    if (expenseId) {
      const existingIds = expense?.instalments.map((i) => i.id) ?? [];
      const keptIds = instalments.filter((i) => i.id).map((i) => i.id as string);
      const removedIds = existingIds.filter((id) => !keptIds.includes(id));
      if (removedIds.length) {
        await supabase.from("expense_instalments").delete().in("id", removedIds);
      }

      for (const inst of instalments) {
        if (!inst.amount) continue;
        const instPayload = {
          expense_id: expenseId,
          amount: Number(inst.amount) || 0,
          due_date: inst.due_date || null,
          paid: inst.paid,
          paid_date: inst.paid ? new Date().toISOString().slice(0, 10) : null,
          reminder_days: inst.reminder_days ? (Number(inst.reminder_days) as ReminderDays) : null,
          label: inst.label || null,
        };
        if (inst.id) {
          await supabase.from("expense_instalments").update(instPayload).eq("id", inst.id);
        } else {
          await supabase.from("expense_instalments").insert(instPayload);
        }
      }
    }

    await logActivity(supabase, {
      weddingId: wedding.id,
      userId: user.id,
      actionType: expense ? "expense.updated" : "expense.created",
      description: expense ? `Updated expense "${name.trim()}".` : `Added expense "${name.trim()}".`,
      entityType: "expense",
      entityId: expenseId,
    });

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={expense ? "Edit expense" : "Add expense"}>
      <div className="space-y-4">
        <Field label="Name" error={nameError}>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(false);
            }}
            placeholder="Photography Package"
          />
        </Field>

        <Field label="Category">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <span className="mb-1.5 block text-sm font-medium">Vendor</span>
          <div className="mb-2 flex gap-2">
            {(["none", "existing", "new"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setVendorMode(mode)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  vendorMode === mode ? "border-primaryStrong bg-primary/10 text-primaryStrong" : "border-line text-muted"
                }`}
              >
                {mode === "none" ? "No vendor" : mode === "existing" ? "Select existing" : "Create new"}
              </button>
            ))}
          </div>
          {vendorMode === "existing" && (
            <Select value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">Choose a vendor…</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
          )}
          {vendorMode === "new" && (
            <div className="space-y-2">
              <Input
                value={newVendorName}
                onChange={(e) => setNewVendorName(e.target.value)}
                placeholder="Vendor / business name"
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
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Total cost" error={totalAmountError}>
            <Input
              type="number"
              value={totalAmount}
              onChange={(e) => {
                setTotalAmount(e.target.value);
                if (totalAmountError) setTotalAmountError(false);
              }}
            />
          </Field>
          <Field label="Deposit paid">
            <Input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
          </Field>
        </div>
        {/* Quick action for the common case of a single, already-settled
            payment — sets deposit_amount to match total_amount, the same
            mechanism computeExpenseTotals already treats as "Paid in Full",
            rather than making the couple type the total into Deposit paid
            themselves. */}
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={totalAmount !== "" && Number(totalAmount) > 0 && Number(depositAmount) === Number(totalAmount)}
            onChange={(e) => setDepositAmount(e.target.checked ? totalAmount : "0")}
            disabled={!totalAmount}
          />
          Paid in full
        </label>

        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Instalments</span>
            <Button type="button" variant="secondary" onClick={addInstalment}>
              + Add instalment
            </Button>
          </div>
          <div className="space-y-3">
            {instalments.map((inst, idx) => (
              <div key={idx} className="space-y-2 rounded-xl border border-line p-3">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Label (optional)"
                    value={inst.label}
                    onChange={(e) => updateInstalment(idx, { label: e.target.value })}
                    className="col-span-2"
                  />
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={inst.amount}
                    onChange={(e) => updateInstalment(idx, { amount: e.target.value })}
                  />
                  <Input
                    type="date"
                    value={inst.due_date}
                    onChange={(e) => updateInstalment(idx, { due_date: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={inst.reminder_days}
                    onChange={(e) => updateInstalment(idx, { reminder_days: e.target.value })}
                    className="flex-1"
                  >
                    {REMINDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                  <label className="flex items-center gap-1.5 whitespace-nowrap text-sm">
                    <input
                      type="checkbox"
                      checked={inst.paid}
                      onChange={(e) => updateInstalment(idx, { paid: e.target.checked })}
                    />
                    Paid
                  </label>
                  <button
                    type="button"
                    onClick={() => removeInstalment(idx)}
                    className="text-sm text-danger"
                    aria-label="Remove instalment"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            {instalments.length === 0 && (
              <p className="text-xs text-muted">No instalments yet — add as many as you need.</p>
            )}
          </div>
        </div>

        <Button fullWidth onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save expense"}
        </Button>
      </div>
    </Modal>
  );
}
