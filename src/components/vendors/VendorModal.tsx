"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { logActivity } from "@/lib/activity/logActivity";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { VENDOR_STATUS_LABEL, VENDOR_STATUS_OPTIONS } from "./VendorStatusBadge";
import type { Vendor, VendorStatus } from "@/lib/types/database";

export function VendorModal({
  open,
  onClose,
  vendor,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  vendor?: Vendor | null;
  onSaved: () => void;
}) {
  const { wedding, user } = useWedding();
  const supabase = createClient();
  const [name, setName] = useState(vendor?.name ?? "");
  const [type, setType] = useState(vendor?.type ?? "");
  const [status, setStatus] = useState<VendorStatus>(vendor?.status ?? "considering");
  const [website, setWebsite] = useState(vendor?.website ?? "");
  const [notes, setNotes] = useState(vendor?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);

  async function handleSave() {
    if (!wedding || !user) return;
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    setSaving(true);

    const payload = {
      wedding_id: wedding.id,
      name: name.trim(),
      type: type.trim() || null,
      status,
      website: website.trim() || null,
      notes: notes.trim() || null,
    };

    if (vendor) {
      await supabase.from("vendors").update(payload).eq("id", vendor.id);
      if (vendor.status !== status) {
        await logActivity(supabase, {
          weddingId: wedding.id,
          userId: user.id,
          actionType: "vendor.status_changed",
          description: `Changed ${name.trim()} from ${VENDOR_STATUS_LABEL[vendor.status]} to ${VENDOR_STATUS_LABEL[status]}.`,
          entityType: "vendor",
          entityId: vendor.id,
        });
      } else {
        await logActivity(supabase, {
          weddingId: wedding.id,
          userId: user.id,
          actionType: "vendor.updated",
          description: `Updated vendor "${name.trim()}".`,
          entityType: "vendor",
          entityId: vendor.id,
        });
      }
    } else {
      const { data } = await supabase.from("vendors").insert(payload).select().single();
      await logActivity(supabase, {
        weddingId: wedding.id,
        userId: user.id,
        actionType: "vendor.created",
        description: `Added vendor "${name.trim()}".`,
        entityType: "vendor",
        entityId: data?.id,
      });
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={vendor ? "Edit vendor" : "Add vendor"}>
      <div className="space-y-4">
        <Field label="Vendor / business name">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(false);
            }}
            className={nameError ? "border-danger focus:border-danger focus:ring-danger/20" : undefined}
          />
          {nameError && <p className="mt-1 text-xs text-danger">Required</p>}
        </Field>
        <Field label="Type">
          <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="Photographer" />
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as VendorStatus)}>
            {VENDOR_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {VENDOR_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Website">
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
        </Field>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Button fullWidth onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save vendor"}
        </Button>
      </div>
    </Modal>
  );
}
