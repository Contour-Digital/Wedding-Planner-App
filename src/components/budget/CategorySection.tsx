import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ExpenseCard } from "./ExpenseCard";
import { formatCurrency } from "@/lib/utils/currency";
import type { CategoryTotals } from "@/lib/types/domain";
import type { ExpenseWithInstalments } from "@/lib/types/domain";
import type { VendorWithRelations } from "@/lib/hooks/useVendors";

export function CategorySection({
  totals,
  expenses,
  vendors,
  currency,
  onEditExpense,
  onChanged,
}: {
  totals: CategoryTotals;
  expenses: ExpenseWithInstalments[];
  vendors: VendorWithRelations[];
  currency?: string;
  onEditExpense: (expense: ExpenseWithInstalments) => void;
  onChanged: () => void;
}) {
  const pct = totals.targetBudget > 0 ? (totals.committed / totals.targetBudget) * 100 : 0;

  return (
    <section className="space-y-3">
      <Card>
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-lg font-semibold">{totals.name}</h3>
          <span className="text-xs text-muted">Target {formatCurrency(totals.targetBudget, currency)}</span>
        </div>
        <ProgressBar value={pct} className="my-3" />
        <div className="grid grid-cols-2 gap-2 text-xs text-muted sm:grid-cols-4">
          <div>Committed: {formatCurrency(totals.committed, currency)}</div>
          <div>Paid: {formatCurrency(totals.paid, currency)}</div>
          <div>Outstanding: {formatCurrency(totals.outstanding, currency)}</div>
          <div className={totals.remainingAgainstTarget < 0 ? "text-danger" : ""}>
            Remaining: {formatCurrency(totals.remainingAgainstTarget, currency)}
          </div>
        </div>
      </Card>

      {expenses.length > 0 && (
        <div className="space-y-2 pl-1">
          {expenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              vendor={vendors.find((v) => v.id === expense.vendor_id)}
              currency={currency}
              onEdit={() => onEditExpense(expense)}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </section>
  );
}
