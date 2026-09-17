"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/nav/PageHeader";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useVendors } from "@/lib/hooks/useVendors";
import { useExpenses } from "@/lib/hooks/useExpenses";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { VendorStatusBadge } from "@/components/vendors/VendorStatusBadge";
import { VendorModal } from "@/components/vendors/VendorModal";
import { formatCurrency, sum } from "@/lib/utils/currency";
import { computeExpenseTotals } from "@/lib/utils/paymentStatus";
import { canSeeFinancials } from "@/lib/utils/permissions";

export default function VendorsPage() {
  const { wedding, role } = useWedding();
  const weddingId = wedding?.id;
  const { vendors, refresh } = useVendors(weddingId);
  const { expenses } = useExpenses(weddingId);
  const [modalOpen, setModalOpen] = useState(false);
  const showFinancials = canSeeFinancials(role);

  return (
    <div>
      <PageHeader title="Vendors" />
      <div className="space-y-4 p-4 sm:p-6">
        <Button onClick={() => setModalOpen(true)}>+ Add vendor</Button>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {vendors.map((vendor) => {
            const linkedExpenses = expenses.filter((e) => e.vendor_id === vendor.id);
            const totals = linkedExpenses.map((e) =>
              computeExpenseTotals(e.total_amount, e.deposit_amount, e.instalments)
            );
            const committed = sum(linkedExpenses.map((e) => e.total_amount));
            const paid = sum(totals.map((t) => t.paidAmount));
            const balance = committed - paid;

            return (
              <Link key={vendor.id} href={`/vendors/${vendor.id}`}>
                <Card className="h-full hover:border-primary/40">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{vendor.name}</p>
                      {vendor.type && <p className="text-xs text-muted">{vendor.type}</p>}
                    </div>
                    <VendorStatusBadge status={vendor.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span>{vendor.contacts.length} contact{vendor.contacts.length === 1 ? "" : "s"}</span>
                    <span>{vendor.documents.length} document{vendor.documents.length === 1 ? "" : "s"}</span>
                    <span>{linkedExpenses.length} expense{linkedExpenses.length === 1 ? "" : "s"}</span>
                  </div>
                  {showFinancials && linkedExpenses.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-2 text-xs">
                      <div>Committed: {formatCurrency(committed, wedding?.currency)}</div>
                      <div>Paid: {formatCurrency(paid, wedding?.currency)}</div>
                      <div className={balance > 0 ? "text-warn" : ""}>
                        Balance: {formatCurrency(balance, wedding?.currency)}
                      </div>
                    </div>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <VendorModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={refresh} />
    </div>
  );
}
