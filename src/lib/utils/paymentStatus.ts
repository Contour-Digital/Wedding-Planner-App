import type { ExpenseInstalment } from "@/lib/types/database";
import type { ExpenseTotals, PaymentStatus } from "@/lib/types/domain";
import { sum } from "./currency";
import { isOverdue } from "./date";

/**
 * Single source of truth for expense payment status. Mirrors the spec:
 *   - Overdue: any unpaid instalment past due date (overrides everything else)
 *   - Paid in Full: total paid >= total amount
 *   - Partially Paid: deposit + some (but not all) instalments paid
 *   - Deposit Paid: deposit > 0 and no instalments paid
 *   - Not Started: nothing paid yet
 * A gift sits outside all of that: its cost still counts as committed, but
 * nothing is owed on it, so it's never outstanding or overdue.
 */
export function computeExpenseTotals(
  totalAmount: number,
  depositAmount: number,
  instalments: ExpenseInstalment[],
  isGift = false
): ExpenseTotals {
  const paidInstalments = instalments.filter((i) => i.paid);
  const unpaidInstalments = instalments.filter((i) => !i.paid);

  const paidAmount = depositAmount + sum(paidInstalments.map((i) => i.amount));
  if (isGift) {
    return { totalAmount, paidAmount, outstandingAmount: 0, status: "gift" };
  }
  const outstandingAmount = Math.max(totalAmount - paidAmount, 0);

  const hasOverdue = unpaidInstalments.some((i) => isOverdue(i.due_date, i.paid));

  let status: PaymentStatus;

  if (hasOverdue) {
    status = "overdue";
  } else if (paidAmount >= totalAmount && totalAmount > 0) {
    status = "paid_in_full";
  } else if (depositAmount > 0 && paidInstalments.length === 0) {
    status = "deposit_paid";
  } else if (paidAmount > 0) {
    status = "partially_paid";
  } else {
    status = "not_started";
  }

  return { totalAmount, paidAmount, outstandingAmount, status };
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  not_started: "Not Started",
  deposit_paid: "Deposit Paid",
  partially_paid: "Partially Paid",
  paid_in_full: "Paid in Full",
  overdue: "Overdue",
  gift: "Gift",
};

export const PAYMENT_STATUS_COLOUR: Record<PaymentStatus, string> = {
  not_started: "bg-line text-muted",
  deposit_paid: "bg-blue-100 text-blue-800",
  partially_paid: "bg-warn/15 text-warn",
  paid_in_full: "bg-good/15 text-good",
  overdue: "bg-danger/15 text-danger",
  gift: "bg-purple-100 text-purple-800",
};
