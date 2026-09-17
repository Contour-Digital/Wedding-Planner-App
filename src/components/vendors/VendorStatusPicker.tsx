"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { logActivity } from "@/lib/activity/logActivity";
import { VENDOR_STATUS_COLOUR, VENDOR_STATUS_LABEL, VENDOR_STATUS_OPTIONS } from "./VendorStatusBadge";
import type { Vendor, VendorStatus } from "@/lib/types/database";

/**
 * A status badge that IS the control — click it to change the vendor's
 * status in place (a native <select> styled to look like the coloured
 * badge), instead of opening the full "Edit vendor" form just to flip one
 * field. Saves straight to Supabase and logs the change to Activity.
 */
export function VendorStatusPicker({ vendor, onChanged }: { vendor: Vendor; onChanged: () => void }) {
  const { wedding, user } = useWedding();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value as VendorStatus;
    if (status === vendor.status) return;
    setSaving(true);

    const { error } = await supabase.from("vendors").update({ status }).eq("id", vendor.id);

    if (!error && wedding && user) {
      await logActivity(supabase, {
        weddingId: wedding.id,
        userId: user.id,
        actionType: "vendor.status_changed",
        description: `Changed ${vendor.name}'s status to "${VENDOR_STATUS_LABEL[status]}".`,
        entityType: "vendor",
        entityId: vendor.id,
      });
    }

    setSaving(false);
    onChanged();
  }

  return (
    <select
      value={vendor.status}
      onChange={handleChange}
      disabled={saving}
      aria-label="Vendor status"
      className={`cursor-pointer appearance-none rounded-full border-0 py-1 pl-2.5 pr-6 text-xs font-medium disabled:opacity-60 ${VENDOR_STATUS_COLOUR[vendor.status]}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236f7a6b'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.4rem center",
        backgroundSize: "0.9em",
      }}
    >
      {VENDOR_STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {VENDOR_STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}
