"use client";

import { useState } from "react";
import Link from "next/link";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { computeExpenseTotals } from "@/lib/utils/paymentStatus";
import { createClient } from "@/lib/supabase/client";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { logActivity } from "@/lib/activity/logActivity";
import type { ExpenseWithInstalments } from "@/lib/types/domain";
import type { VendorWithRelations } from "@/lib/hooks/useVendors";

export function ExpenseCard({
  expense,
  vendor,
  currency,
  onEdit,
  onChanged,
}: {
  expense: ExpenseWithInstalments;
  vendor?: VendorWithRelations;
  currency?: string;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const { wedding, user } = useWedding();
  const supabase = createClient();
  const [expanded, setExpanded] = useState(false);
  const totals = computeExpenseTotals(expense.total_amount, expense.deposit_amount, expense.instalments);

  async function toggleInstalmentPaid(instalmentId: string, paid: boolean, label: string, amount: number) {
    await supabase
      .from("expense_instalments")
      .update({ paid, paid_date: paid ? new Date().toISOString().slice(0, 10) : null })
      .eq("id", instalmentId);

    if (wedding && user) {
      await logActivity(supabase, {
        weddingId: wedding.id,
        userId: user.id,
        actionType: paid ? "instalment.paid" : "instalment.unpaid",
        description: `${paid ? "Marked" : "Unmarked"} ${expense.name}${label ? ` (${label})` : ""} instalment of ${formatCurrency(amount, currency)} as ${paid ? "paid" : "unpaid"}.`,
        entityType: "expense",
        entityId: expense.id,
      });
    }
    onChanged();
  }

  return (
    // Light grey, not another white Card — these sit nested inside the
    // category's own (white) Card, so they need to read as "within it"
    // rather than as their own separate boxes.
    <div className="rounded-xl bg-line/40 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{expense.name}</p>
          {vendor && (
            <Link href={`/vendors/${vendor.id}`} className="text-xs text-primaryStrong underline">
              {vendor.name}
            </Link>
          )}
        </div>
        <div className="text-right">
          <p className="font-semibold">{formatCurrency(expense.total_amount, currency)}</p>
          <PaymentStatusBadge status={totals.status} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted">
        <div>Paid: {formatCurrency(totals.paidAmount, currency)}</div>
        <div>Outstanding: {formatCurrency(totals.outstandingAmount, currency)}</div>
        <div>Deposit: {formatCurrency(expense.deposit_amount, currency)}</div>
      </div>

      {expense.instalments.length > 0 && (
        <button
          className="mt-3 text-xs font-medium text-primaryStrong"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Hide" : "Show"} instalments ({expense.instalments.length})
        </button>
      )}

      {expanded && (
        <div className="mt-2 space-y-2 border-t border-line pt-2">
          {expense.instalments.map((inst) => (
            <div key={inst.id} className="flex items-center justify-between text-sm">
              <div>
                <p>{inst.label || "Instalment"}</p>
                <p className="text-xs text-muted">Due {formatDate(inst.due_date)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatCurrency(inst.amount, currency)}</span>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={inst.paid}
                    onChange={(e) =>
                      toggleInstalmentPaid(inst.id, e.target.checked, inst.label ?? "", inst.amount)
                    }
                  />
                  Paid
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={onEdit} className="mt-3 text-xs font-medium text-primaryStrong">
        Edit expense
      </button>
    </div>
  );
}
