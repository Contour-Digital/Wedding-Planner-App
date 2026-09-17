"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/nav/PageHeader";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useVendors } from "@/lib/hooks/useVendors";
import { useExpenses } from "@/lib/hooks/useExpenses";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { VendorStatusBadge } from "@/components/vendors/VendorStatusBadge";
import { VendorStatusPicker } from "@/components/vendors/VendorStatusPicker";
import { VendorModal } from "@/components/vendors/VendorModal";
import { ContactManager } from "@/components/vendors/ContactManager";
import { DocumentManager } from "@/components/vendors/DocumentManager";
import { PaymentStatusBadge } from "@/components/budget/PaymentStatusBadge";
import { formatCurrency, sum } from "@/lib/utils/currency";
import { computeExpenseTotals } from "@/lib/utils/paymentStatus";
import { canEdit, canSeeFinancials } from "@/lib/utils/permissions";

export default function VendorDetailPage() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const router = useRouter();
  const { wedding, role } = useWedding();
  const { vendors, refresh } = useVendors(wedding?.id);
  const { expenses } = useExpenses(wedding?.id);
  const [editOpen, setEditOpen] = useState(false);
  const showFinancials = canSeeFinancials(role);
  const editable = canEdit(role);

  const vendor = vendors.find((v) => v.id === vendorId);
  if (!vendor) {
    return (
      <div>
        <PageHeader title="Vendor" />
        <p className="p-6 text-sm text-muted">Loading…</p>
      </div>
    );
  }

  const linkedExpenses = expenses.filter((e) => e.vendor_id === vendor.id);
  const totals = linkedExpenses.map((e) => computeExpenseTotals(e.total_amount, e.deposit_amount, e.instalments));
  const committed = sum(linkedExpenses.map((e) => e.total_amount));
  const paid = sum(totals.map((t) => t.paidAmount));
  const balance = committed - paid;

  return (
    <div>
      <PageHeader title={vendor.name} />
      <div className="space-y-6 p-4 sm:p-6">
        <button onClick={() => router.back()} className="text-sm font-medium text-primaryStrong">
          ← Back to vendors
        </button>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold">{vendor.name}</h2>
              {vendor.type && <p className="text-sm text-muted">{vendor.type}</p>}
              {vendor.website && (
                <a href={vendor.website} target="_blank" rel="noreferrer" className="text-xs text-primaryStrong underline">
                  {vendor.website}
                </a>
              )}
            </div>
            {editable ? (
              <VendorStatusPicker vendor={vendor} onChanged={refresh} />
            ) : (
              <VendorStatusBadge status={vendor.status} />
            )}
          </div>
          {vendor.notes && <p className="mt-3 text-sm text-muted">{vendor.notes}</p>}
          {editable && (
            <Button variant="secondary" className="mt-4" onClick={() => setEditOpen(true)}>
              Edit vendor
            </Button>
          )}
        </Card>

        {showFinancials && (
          <Card>
            <h3 className="mb-3 font-display text-lg font-semibold">Linked expenses</h3>
            <div className="mb-3 grid grid-cols-3 gap-2 text-xs text-muted">
              <div>Committed: {formatCurrency(committed, wedding?.currency)}</div>
              <div>Paid: {formatCurrency(paid, wedding?.currency)}</div>
              <div className={balance > 0 ? "text-warn" : ""}>
                Balance owing: {formatCurrency(balance, wedding?.currency)}
              </div>
            </div>
            <div className="space-y-2">
              {linkedExpenses.map((e) => {
                const t = computeExpenseTotals(e.total_amount, e.deposit_amount, e.instalments);
                return (
                  <div key={e.id} className="flex items-center justify-between rounded-xl border border-line p-3">
                    <p className="text-sm font-medium">{e.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{formatCurrency(e.total_amount, wedding?.currency)}</span>
                      <PaymentStatusBadge status={t.status} />
                    </div>
                  </div>
                );
              })}
              {linkedExpenses.length === 0 && <p className="text-sm text-muted">No expenses linked yet.</p>}
            </div>
          </Card>
        )}

        <ContactManager vendorId={vendor.id} contacts={vendor.contacts} onChanged={refresh} />
        <DocumentManager vendorId={vendor.id} documents={vendor.documents} onChanged={refresh} />
      </div>

      <VendorModal open={editOpen} onClose={() => setEditOpen(false)} vendor={vendor} onSaved={refresh} />
    </div>
  );
}
