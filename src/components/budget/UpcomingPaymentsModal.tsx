"use client";

import { useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { formatCurrency, sum } from "@/lib/utils/currency";
import { formatDate, isOverdue } from "@/lib/utils/date";
import { createClient } from "@/lib/supabase/client";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { logActivity } from "@/lib/activity/logActivity";
import { canEdit } from "@/lib/utils/permissions";
import type { ExpenseWithInstalments } from "@/lib/types/domain";
import type { Vendor } from "@/lib/types/database";

export function UpcomingPaymentsModal({
  open,
  onClose,
  expenses,
  vendors,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  expenses: ExpenseWithInstalments[];
  vendors: Vendor[];
  currency?: string;
}) {
  const { wedding, user, role } = useWedding();
  const supabase = createClient();
  const editable = canEdit(role);
  // Ticks show immediately rather than waiting for the realtime reload of
  // expenses to come back through props.
  const [savedOverrides, setSavedOverrides] = useState<Record<string, boolean>>({});

  // Gifts never have anything owed on them, whatever instalments they carry.
  const upcoming = expenses
    .filter((e) => !e.is_gift)
    .flatMap((e) => {
      const vendorName = vendors.find((v) => v.id === e.vendor_id)?.name;
      return e.instalments.map((i) => ({
        ...i,
        saved: savedOverrides[i.id] ?? i.saved,
        expenseId: e.id,
        expenseName: e.name,
        vendorName,
      }));
    })
    .filter((i) => !i.paid)
    .sort((a, b) => (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99"));

  const outstandingTotal = sum(upcoming.map((p) => p.amount));
  const savedTotal = sum(upcoming.filter((p) => p.saved).map((p) => p.amount));
  const stillToSave = outstandingTotal - savedTotal;

  async function toggleSaved(p: (typeof upcoming)[number], saved: boolean) {
    setSavedOverrides((prev) => ({ ...prev, [p.id]: saved }));
    const { error } = await supabase.from("expense_instalments").update({ saved }).eq("id", p.id);
    if (error) {
      setSavedOverrides((prev) => ({ ...prev, [p.id]: !saved }));
      return;
    }

    if (wedding && user) {
      const name = p.vendorName ?? p.expenseName;
      const label = p.kind === "balance" ? "Balance" : p.label;
      await logActivity(supabase, {
        weddingId: wedding.id,
        userId: user.id,
        actionType: saved ? "instalment.saved" : "instalment.unsaved",
        description: `${saved ? "Marked" : "Unmarked"} ${name}${label ? ` (${label})` : ""} payment of ${formatCurrency(p.amount, currency)} as saved.`,
        entityType: "expense",
        entityId: p.expenseId,
      });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Upcoming Payments">
      <div className="space-y-2">
        {upcoming.length > 0 && (
          <Card className="grid grid-cols-3 gap-2 text-center">
            <SummaryFigure label="Outstanding" value={formatCurrency(outstandingTotal, currency)} />
            <SummaryFigure label="Saved" value={formatCurrency(savedTotal, currency)} tone="good" />
            <SummaryFigure
              label="Still to save"
              value={formatCurrency(stillToSave, currency)}
              tone={stillToSave > 0 ? "warn" : "good"}
            />
          </Card>
        )}
        {upcoming.map((p) => (
          <Card key={p.id} className="flex items-center justify-between gap-3">
            {/* Deep-links into Budget, which auto-opens this expense via its
                ?expense= query param — closing the modal first so it doesn't
                sit on top of the expense modal that opens there. The Saved
                tick sits outside the link so ticking it doesn't navigate. */}
            <Link href={`/budget?expense=${p.expenseId}`} onClick={onClose} className="block min-w-0 flex-1">
              <p className="text-sm font-medium">{p.vendorName ?? p.expenseName}</p>
              {p.label && <p className="text-xs text-muted">{p.label}</p>}
              <p className="text-xs text-muted">
                {isOverdue(p.due_date, p.paid) ? "Was due" : "Due"} {formatDate(p.due_date)}
              </p>
            </Link>
            <div className="flex flex-col items-end gap-1">
              <p className="font-semibold">{formatCurrency(p.amount, currency)}</p>
              <label className="flex items-center gap-1 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={p.saved}
                  disabled={!editable}
                  onChange={(e) => toggleSaved(p, e.target.checked)}
                />
                Saved
              </label>
            </div>
          </Card>
        ))}
        {upcoming.length === 0 && <p className="text-sm text-muted">No upcoming payments.</p>}
      </div>
    </Modal>
  );
}

function SummaryFigure({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={clsx("truncate text-sm font-semibold", tone === "good" && "text-good", tone === "warn" && "text-warn")}>
        {value}
      </p>
    </div>
  );
}
