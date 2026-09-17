"use client";

import { useState } from "react";
import { PageHeader } from "@/components/nav/PageHeader";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useExpenses } from "@/lib/hooks/useExpenses";
import { useCategories } from "@/lib/hooks/useCategories";
import { useVendors } from "@/lib/hooks/useVendors";
import { categoryTotals, weddingTotals } from "@/lib/utils/budget";
import { formatCurrency } from "@/lib/utils/currency";
import { StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CategorySection } from "@/components/budget/CategorySection";
import { ExpenseModal } from "@/components/budget/ExpenseModal";
import { canEdit } from "@/lib/utils/permissions";
import type { ExpenseWithInstalments } from "@/lib/types/domain";

export default function BudgetPage() {
  const { wedding, role } = useWedding();
  const weddingId = wedding?.id;
  const { expenses, refresh: refreshExpenses } = useExpenses(weddingId);
  const { categories, refresh: refreshCategories } = useCategories(weddingId);
  const { vendors } = useVendors(weddingId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithInstalments | null>(null);

  if (!canEdit(role)) {
    return (
      <div>
        <PageHeader title="Budget" />
        <p className="p-6 text-sm text-muted">Budget information is only visible to the couple.</p>
      </div>
    );
  }

  const totals = weddingTotals(wedding?.total_budget ?? 0, expenses);
  const byCategory = categoryTotals(categories, expenses);

  function refresh() {
    refreshExpenses();
    refreshCategories();
  }

  function openAdd() {
    setEditingExpense(null);
    setModalOpen(true);
  }

  function openEdit(expense: ExpenseWithInstalments) {
    setEditingExpense(expense);
    setModalOpen(true);
  }

  return (
    <div>
      <PageHeader title="Budget" />
      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Total Budget" value={formatCurrency(totals.totalBudget, wedding?.currency)} />
          <StatCard label="Committed" value={formatCurrency(totals.committed, wedding?.currency)} />
          <StatCard label="Paid" value={formatCurrency(totals.paid, wedding?.currency)} tone="good" />
          <StatCard label="Outstanding" value={formatCurrency(totals.outstanding, wedding?.currency)} tone="warn" />
          <StatCard
            label="Remaining"
            value={formatCurrency(totals.remaining, wedding?.currency)}
            tone={totals.remaining < 0 ? "danger" : "default"}
          />
        </div>

        <Button onClick={openAdd}>+ Add expense</Button>

        <div className="space-y-8">
          {byCategory.map((cat) => (
            <CategorySection
              key={cat.categoryId}
              totals={cat}
              expenses={expenses.filter((e) => e.category_id === cat.categoryId)}
              vendors={vendors}
              currency={wedding?.currency}
              onEditExpense={openEdit}
              onChanged={refresh}
            />
          ))}
        </div>
      </div>

      <ExpenseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        categories={categories}
        vendors={vendors}
        expense={editingExpense}
        onSaved={refresh}
      />
    </div>
  );
}
