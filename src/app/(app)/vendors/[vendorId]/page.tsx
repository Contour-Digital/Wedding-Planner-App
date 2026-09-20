"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/nav/PageHeader";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useVendors } from "@/lib/hooks/useVendors";
import { useExpenses } from "@/lib/hooks/useExpenses";
import { useCategories } from "@/lib/hooks/useCategories";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { VendorStatusBadge } from "@/components/vendors/VendorStatusBadge";
import { VendorStatusPicker } from "@/components/vendors/VendorStatusPicker";
import { VendorModal } from "@/components/vendors/VendorModal";
import { ContactManager } from "@/components/vendors/ContactManager";
import { DocumentManager } from "@/components/vendors/DocumentManager";
import { PaymentStatusBadge } from "@/components/budget/PaymentStatusBadge";
import { ExpenseModal } from "@/components/budget/ExpenseModal";
import { formatCurrency, sum } from "@/lib/utils/currency";
import { computeExpenseTotals } from "@/lib/utils/paymentStatus";
import { canEdit, canSeeFinancials } from "@/lib/utils/permissions";
import type { ExpenseWithInstalments } from "@/lib/types/domain";

export default function VendorDetailPage() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const { wedding, role } = useWedding();
  const { vendors, refresh } = useVendors(wedding?.id);
  const { expenses, refresh: refreshExpenses } = useExpenses(wedding?.id);
  const { categories } = useCategories(wedding?.id);
  const [editOpen, setEditOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithInstalments | null>(null);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  // Bumped on every open so ExpenseModal (whose fields only seed from
  // `expense` on mount) remounts fresh instead of showing whichever
  // expense's data happened to be loaded first.
  const [expenseModalKey, setExpenseModalKey] = useState(0);
  const showFinancials = canSeeFinancials(role);
  const editable = canEdit(role);

  function openEditExpense(exp: ExpenseWithInstalments) {
    setEditingExpense(exp);
    setExpenseModalKey((k) => k + 1);
    setExpenseModalOpen(true);
  }

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
        {/* A plain link, not router.back() — this page can be reached from
            more than just the Vendors list (Contacts' "View vendor", a
            direct link, …), so browser history isn't reliably "the Vendors
            tab". */}
        <Link href="/vendors" className="text-sm font-medium text-primaryStrong">
          ← Back to vendors
        </Link>

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
                    <div className="flex items-center gap-3">
                      <span className="text-sm">{formatCurrency(e.total_amount, wedding?.currency)}</span>
                      <PaymentStatusBadge status={t.status} />
                      {editable && (
                        <button
                          onClick={() => openEditExpense(e)}
                          className="text-xs font-medium text-primaryStrong"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {linkedExpenses.length === 0 && <p className="text-sm text-muted">No expenses linked yet.</p>}
            </div>
          </Card>
        )}

        <ContactManager vendorId={vendor.id} contacts={vendor.contacts} editable={editable} onChanged={refresh} />
        <DocumentManager
          weddingId={wedding!.id}
          vendorId={vendor.id}
          documents={vendor.documents}
          onChanged={refresh}
        />
      </div>

      <VendorModal open={editOpen} onClose={() => setEditOpen(false)} vendor={vendor} onSaved={refresh} />
      {editable && (
        <ExpenseModal
          key={expenseModalKey}
          open={expenseModalOpen}
          onClose={() => setExpenseModalOpen(false)}
          categories={categories}
          vendors={vendors}
          expense={editingExpense}
          onSaved={refreshExpenses}
        />
      )}
    </div>
  );
}
