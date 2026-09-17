import type { Expense, ExpenseInstalment } from "./database";

export type PaymentStatus = "not_started" | "deposit_paid" | "partially_paid" | "paid_in_full" | "overdue";

export interface ExpenseWithInstalments extends Expense {
  instalments: ExpenseInstalment[];
}

export interface ExpenseTotals {
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: PaymentStatus;
}

export interface CategoryTotals {
  categoryId: string | null;
  name: string;
  targetBudget: number;
  committed: number;
  paid: number;
  outstanding: number;
  remainingAgainstTarget: number;
}

export interface WeddingTotals {
  totalBudget: number;
  committed: number;
  paid: number;
  outstanding: number;
  remaining: number;
}
