"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/nav/PageHeader";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { useExpenses } from "@/lib/hooks/useExpenses";
import { useCategories } from "@/lib/hooks/useCategories";
import { useVendors } from "@/lib/hooks/useVendors";
import { categoryTotals, weddingTotals } from "@/lib/utils/budget";
import { formatCurrency, sum } from "@/lib/utils/currency";
import { computeExpenseTotals, PAYMENT_STATUS_LABEL } from "@/lib/utils/paymentStatus";
import { downloadCsv } from "@/lib/utils/csv";
import { StatCard, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { CategorySection } from "@/components/budget/CategorySection";
import { ExpenseModal } from "@/components/budget/ExpenseModal";
import { BudgetBreakdownChart } from "@/components/budget/BudgetBreakdownChart";
import { AddCategoryForm } from "@/components/budget/AddCategoryForm";
import { ReorderCategoriesModal } from "@/components/budget/ReorderCategoriesModal";
import { UpcomingPaymentsModal } from "@/components/budget/UpcomingPaymentsModal";
import { canEdit } from "@/lib/utils/permissions";
import type { ExpenseWithInstalments } from "@/lib/types/domain";

type CategorySort = "alphabetical" | "custom";
const CATEGORY_SORT_STORAGE_KEY = "wedding-planner:budget-category-sort";

export default function BudgetPage() {
  const router = useRouter();
  const { wedding, role } = useWedding();
  const weddingId = wedding?.id;
  const { expenses, refresh: refreshExpenses } = useExpenses(weddingId);
  const { categories, refresh: refreshCategories } = useCategories(weddingId);
  const { vendors } = useVendors(weddingId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithInstalments | null>(null);
  // Bumped on every open so ExpenseModal remounts with a fresh key each time —
  // its form fields are only seeded from `expense` on mount, so without this
  // reopening it for a different expense (or for "add" after an edit) would
  // keep showing whatever was loaded the first time the modal ever opened.
  const [modalKey, setModalKey] = useState(0);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  // Purely a display preference (not shared data), so it lives in
  // localStorage rather than the database — remembered per device, same as
  // any other "how I like to view this" setting.
  const [categorySort, setCategorySort] = useState<CategorySort>("alphabetical");
  useEffect(() => {
    const stored = localStorage.getItem(CATEGORY_SORT_STORAGE_KEY);
    if (stored === "alphabetical" || stored === "custom") setCategorySort(stored);
  }, []);
  function changeCategorySort(next: CategorySort) {
    setCategorySort(next);
    localStorage.setItem(CATEGORY_SORT_STORAGE_KEY, next);
  }

  function openEdit(expense: ExpenseWithInstalments) {
    setEditingExpense(expense);
    setModalKey((k) => k + 1);
    setModalOpen(true);
  }

  // Lets the "Upcoming Payments" modal (opened from here or Dashboard)
  // deep-link straight into editing a specific expense via
  // /budget?expense=<id>, instead of landing here and making the couple
  // find it themselves.
  // Read directly off window.location rather than useSearchParams() so
  // this client page doesn't need a Suspense boundary just for this. Above
  // the canEdit early return — hooks must run in the same order every
  // render regardless of role.
  const autoOpenedExpenseId = useRef<string | null>(null);
  useEffect(() => {
    const expenseId = new URLSearchParams(window.location.search).get("expense");
    if (!expenseId || autoOpenedExpenseId.current === expenseId) return;
    const match = expenses.find((e) => e.id === expenseId);
    if (!match) return;
    autoOpenedExpenseId.current = expenseId;
    openEdit(match);
    router.replace("/budget");
  }, [expenses, router]);

  if (!canEdit(role)) {
    return (
      <div>
        <PageHeader title="Budget" />
        <p className="p-6 text-sm text-muted">Budget information is only visible to the couple.</p>
      </div>
    );
  }

  const totals = weddingTotals(wedding?.total_budget ?? 0, expenses, vendors);
  const byCategory = categoryTotals(categories, expenses, vendors);
  const expectedCosts = sum(byCategory.map((c) => c.targetBudget));
  const sortedCategories =
    categorySort === "alphabetical"
      ? [...byCategory].sort((a, b) => a.name.localeCompare(b.name))
      : byCategory; // already in the couple's own arranged order (sort_order)

  function refresh() {
    refreshExpenses();
    refreshCategories();
  }

  function openAdd() {
    setEditingExpense(null);
    setModalKey((k) => k + 1);
    setModalOpen(true);
  }

  function exportCsv() {
    const rows = expenses.map((e) => {
      const category = categories.find((c) => c.id === e.category_id);
      const vendor = vendors.find((v) => v.id === e.vendor_id);
      const t = computeExpenseTotals(e.total_amount, e.deposit_amount, e.instalments);
      return [
        e.name,
        category?.name ?? "",
        vendor?.name ?? "",
        e.total_amount,
        e.deposit_amount,
        t.paidAmount,
        t.outstandingAmount,
        PAYMENT_STATUS_LABEL[t.status],
      ];
    });
    downloadCsv(
      `budget-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Name", "Category", "Vendor", "Total Amount", "Deposit Amount", "Paid Amount", "Outstanding Amount", "Payment Status"],
      rows
    );
  }

  return (
    <div>
      <PageHeader title="Budget" />
      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
          <StatCard label="Total Budget" value={formatCurrency(expectedCosts, wedding?.currency)} />
          <StatCard label="Ideal Budget" value={formatCurrency(totals.totalBudget, wedding?.currency)} />
          <StatCard label="Committed" value={formatCurrency(totals.committed, wedding?.currency)} />
          <StatCard label="Paid" value={formatCurrency(totals.paid, wedding?.currency)} tone="good" />
          <StatCard
            label="Outstanding Payments"
            value={formatCurrency(totals.outstanding, wedding?.currency)}
            tone="warn"
          />
          <StatCard
            label="Ideal Budget Remaining"
            value={formatCurrency(totals.remaining, wedding?.currency)}
            tone={totals.remaining < 0 ? "danger" : "default"}
          />
        </div>

        <Button variant="outline" className="mt-2" onClick={() => setUpcomingOpen(true)}>
          View upcoming payments
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={openAdd}>+ Add expense</Button>
          <Button variant="secondary" onClick={exportCsv} disabled={expenses.length === 0}>
            Export CSV
          </Button>
        </div>

        <BudgetBreakdownChart categories={byCategory} currency={wedding?.currency} />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-semibold">Categories</h3>
          <div className="flex items-center gap-2">
            <Select
              value={categorySort}
              onChange={(e) => changeCategorySort(e.target.value as CategorySort)}
              className="w-auto"
            >
              <option value="alphabetical">Alphabetical</option>
              <option value="custom">Arrange yourself</option>
            </Select>
            {categorySort === "custom" && (
              <button
                type="button"
                onClick={() => setReorderOpen(true)}
                className="rounded-full border border-primaryStrong bg-primary/10 px-3 py-1.5 text-xs font-medium text-primaryStrong"
              >
                Arrange categories
              </button>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {sortedCategories.map((cat) => (
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

        <Card className="space-y-3">
          <h3 className="font-display text-lg font-semibold">Add category</h3>
          <AddCategoryForm categories={categories} onAdded={refreshCategories} />
          <Link href="/budget/categories" className="inline-block text-sm font-medium text-primaryStrong">
            Manage categories (rename, budgets, remove) →
          </Link>
        </Card>
      </div>

      <ExpenseModal
        key={modalKey}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        categories={categories}
        vendors={vendors}
        expense={editingExpense}
        onSaved={refresh}
      />
      <ReorderCategoriesModal
        open={reorderOpen}
        onClose={() => setReorderOpen(false)}
        categories={categories}
        onSaved={refreshCategories}
      />
      <UpcomingPaymentsModal
        open={upcomingOpen}
        onClose={() => setUpcomingOpen(false)}
        expenses={expenses}
        vendors={vendors}
        currency={wedding?.currency}
      />
    </div>
  );
}
