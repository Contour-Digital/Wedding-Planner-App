import type { ExpenseCategory } from "@/lib/types/database";
import type { CategoryTotals, ExpenseWithInstalments, WeddingTotals } from "@/lib/types/domain";
import { computeExpenseTotals } from "./paymentStatus";
import { sum } from "./currency";

export function categoryTotals(
  categories: ExpenseCategory[],
  expenses: ExpenseWithInstalments[]
): CategoryTotals[] {
  return categories.map((category) => {
    const categoryExpenses = expenses.filter((e) => e.category_id === category.id);
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

export function weddingTotals(totalBudget: number, expenses: ExpenseWithInstalments[]): WeddingTotals {
  const totals = expenses.map((e) => computeExpenseTotals(e.total_amount, e.deposit_amount, e.instalments));
  const committed = sum(expenses.map((e) => e.total_amount));
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
