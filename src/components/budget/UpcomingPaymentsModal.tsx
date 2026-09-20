"use client";

import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate, isOverdue } from "@/lib/utils/date";
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
  const upcoming = expenses
    .flatMap((e) => {
      const vendorName = vendors.find((v) => v.id === e.vendor_id)?.name;
      return e.instalments.map((i) => ({ ...i, expenseId: e.id, expenseName: e.name, vendorName }));
    })
    .filter((i) => !i.paid)
    .sort((a, b) => (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99"));

  return (
    <Modal open={open} onClose={onClose} title="Upcoming Payments">
      <div className="space-y-2">
        {upcoming.map((p) => (
          // Deep-links into Budget, which auto-opens this expense via its
          // ?expense= query param — closing the modal first so it doesn't
          // sit on top of the expense modal that opens there.
          <Link key={p.id} href={`/budget?expense=${p.expenseId}`} onClick={onClose} className="block">
            <Card className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{p.vendorName ?? p.expenseName}</p>
                {p.label && <p className="text-xs text-muted">{p.label}</p>}
                <p className="text-xs text-muted">
                  {isOverdue(p.due_date, p.paid) ? "Was due" : "Due"} {formatDate(p.due_date)}
                </p>
              </div>
              <p className="font-semibold">{formatCurrency(p.amount, currency)}</p>
            </Card>
          </Link>
        ))}
        {upcoming.length === 0 && <p className="text-sm text-muted">No upcoming payments.</p>}
      </div>
    </Modal>
  );
}
