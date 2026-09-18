"use client";

import Link from "next/link";
import { PageHeader } from "@/components/nav/PageHeader";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useExpenses } from "@/lib/hooks/useExpenses";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate, isOverdue } from "@/lib/utils/date";
import { canEdit } from "@/lib/utils/permissions";

// Not in the main nav or hamburger menu — reached only via the Dashboard's
// "View all upcoming payments" link and Budget's "Upcoming payments" pill,
// same pattern as /wedding-day/print and /export/binder.
export default function UpcomingPaymentsPage() {
  const { wedding, role } = useWedding();
  const { expenses } = useExpenses(wedding?.id);

  if (!canEdit(role)) {
    return (
      <div>
        <PageHeader title="Upcoming Payments" />
        <p className="p-6 text-sm text-muted">Budget information is only visible to the couple.</p>
      </div>
    );
  }

  const upcoming = expenses
    .flatMap((e) => e.instalments.map((i) => ({ ...i, expenseName: e.name })))
    .filter((i) => !i.paid)
    .sort((a, b) => (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99"));

  return (
    <div>
      <PageHeader title="Upcoming Payments" />
      <div className="space-y-6 p-4 sm:p-6">
        <div className="space-y-2">
          {upcoming.map((p) => (
            <Card key={p.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{p.expenseName}</p>
                {p.label && <p className="text-xs text-muted">{p.label}</p>}
                <p className="text-xs text-muted">
                  {isOverdue(p.due_date, p.paid) ? "Was due" : "Due"} {formatDate(p.due_date)}
                </p>
              </div>
              <p className="font-semibold">{formatCurrency(p.amount, wedding?.currency)}</p>
            </Card>
          ))}
          {upcoming.length === 0 && <p className="text-sm text-muted">No upcoming payments.</p>}
        </div>
        <Link href="/budget" className="inline-block text-sm font-medium text-primaryStrong">
          ← Back to Budget
        </Link>
      </div>
    </div>
  );
}
