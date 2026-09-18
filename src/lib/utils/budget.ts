import type { ExpenseCategory, Vendor } from "@/lib/types/database";
import type { CategoryTotals, ExpenseWithInstalments, WeddingTotals } from "@/lib/types/domain";
import { computeExpenseTotals } from "./paymentStatus";
import { sum } from "./currency";

// An expense linked to a vendor only counts toward budget totals once that
// vendor is actually Booked — a quote from a vendor still at Considering/
// Contacted/Quote Received shouldn't inflate what the couple's actually
// committed to, even if a deposit happens to already be recorded against
// it (that's still tracked on the expense itself, just not rolled up here
// until the vendor's booked). An expense with no vendor always counts —
// there's nothing to gate it on.
function countsTowardBudget(expense: ExpenseWithInstalments, vendorsById: Map<string, Vendor>) {
  if (!expense.vendor_id) return true;
  return vendorsById.get(expense.vendor_id)?.status === "booked";
}

export function categoryTotals(
  categories: ExpenseCategory[],
  expenses: ExpenseWithInstalments[],
  vendors: Vendor[]
): CategoryTotals[] {
  const vendorsById = new Map(vendors.map((v) => [v.id, v]));
  return categories.map((category) => {
    const categoryExpenses = expenses
      .filter((e) => e.category_id === category.id)
      .filter((e) => countsTowardBudget(e, vendorsById));
    const totals = categoryExpenses.map((e) =>
      computeExpenseTotals(e.total_amount, e.deposit_amount, e.instalments)
    );
    const committed = sum(categoryExpenses.map((e) => e.total_amount));
    const paid = sum(totals.map((t) => t.paidAmount));
    const outstanding = sum(totals.map((t) => t.outstandingAmount));

    return {
      categoryId: category.id,
      name: category.name,
      targetBudget: category.target_budget,
      committed,
      paid,
      outstanding,
      remainingAgainstTarget: category.target_budget - committed,
    };
  });
}

export function weddingTotals(
  totalBudget: number,
  expenses: ExpenseWithInstalments[],
  vendors: Vendor[]
): WeddingTotals {
  const vendorsById = new Map(vendors.map((v) => [v.id, v]));
  const countedExpenses = expenses.filter((e) => countsTowardBudget(e, vendorsById));
  const totals = countedExpenses.map((e) => computeExpenseTotals(e.total_amount, e.deposit_amount, e.instalments));
  const committed = sum(countedExpenses.map((e) => e.total_amount));
  const paid = sum(totals.map((t) => t.paidAmount));
  const outstanding = sum(totals.map((t) => t.outstandingAmount));

  return {
    totalBudget,
    committed,
    paid,
    outstanding,
    remaining: totalBudget - committed,
  };
}
