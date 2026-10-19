"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ExpenseCard } from "./ExpenseCard";
import { QuoteCard } from "./QuoteCard";
import { formatCurrency } from "@/lib/utils/currency";
import type { CategoryTotals } from "@/lib/types/domain";
import type { ExpenseWithInstalments } from "@/lib/types/domain";
import type { ExpenseQuote } from "@/lib/types/database";
import type { VendorWithRelations } from "@/lib/hooks/useVendors";

export function CategorySection({
  totals,
  expenses,
  vendors,
  currency,
  quotes,
  onEditExpense,
  onAddQuote,
  onEditQuote,
  onAcceptQuote,
  onCompareQuotes,
  onChanged,
}: {
  totals: CategoryTotals;
  expenses: ExpenseWithInstalments[];
  vendors: VendorWithRelations[];
  currency?: string;
  // Every quote in this category; accepted ones are skipped here since
  // they now show as the expense they became.
  quotes: ExpenseQuote[];
  onEditExpense: (expense: ExpenseWithInstalments) => void;
  onAddQuote: () => void;
  onEditQuote: (quote: ExpenseQuote) => void;
  onAcceptQuote: (quote: ExpenseQuote) => void;
  onCompareQuotes: () => void;
  onChanged: () => void;
}) {
  const [showDeclined, setShowDeclined] = useState(false);
  const pct = totals.targetBudget > 0 ? (totals.committed / totals.targetBudget) * 100 : 0;
  const considering = quotes.filter((q) => q.status === "considering");
  const declined = quotes.filter((q) => q.status === "declined");
  const amounts = considering.map((q) => q.amount);
  const low = Math.min(...amounts);
  const high = Math.max(...amounts);

  return (
    <Card className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-lg font-semibold">{totals.name}</h3>
          <span className="text-xs text-muted">Budget {formatCurrency(totals.targetBudget, currency)}</span>
        </div>
        <ProgressBar value={pct} className="my-3" />
        <div className="grid grid-cols-2 gap-2 text-xs text-muted sm:grid-cols-4">
          <div>Committed: {formatCurrency(totals.committed, currency)}</div>
          <div>Paid: {formatCurrency(totals.paid, currency)}</div>
          <div>Outstanding: {formatCurrency(totals.outstanding, currency)}</div>
          <div className={totals.remainingAgainstTarget < 0 ? "text-danger" : ""}>
            Budget Remaining: {formatCurrency(totals.remainingAgainstTarget, currency)}
          </div>
        </div>
      </div>

      {expenses.length > 0 && (
        <div className="space-y-2 border-t border-line pt-4">
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

      <div className="space-y-2 border-t border-line pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Kept apart from the figures above: quotes are options being
              weighed up, not money committed, so they never touch the
              category's totals. With several quotes the range is shown
              rather than a sum, since only one will usually be picked. */}
          <p className="text-xs text-muted">
            {considering.length === 0
              ? "No quotes being considered"
              : `Considering: ${
                  low === high
                    ? formatCurrency(low, currency)
                    : `${formatCurrency(low, currency)} – ${formatCurrency(high, currency)}`
                } (${considering.length} ${considering.length === 1 ? "quote" : "quotes"})`}
          </p>
          <div className="flex flex-wrap gap-2">
            {considering.length >= 2 && (
              <button
                onClick={onCompareQuotes}
                className="rounded-full border border-primaryStrong bg-primary/10 px-3 py-0.5 text-xs font-medium text-primaryStrong"
              >
                Compare
              </button>
            )}
            <button
              onClick={onAddQuote}
              className="rounded-full border border-primaryStrong bg-primary/10 px-3 py-0.5 text-xs font-medium text-primaryStrong"
            >
              + Add quote
            </button>
          </div>
        </div>
        {considering.map((quote) => (
          <QuoteCard
            key={quote.id}
            quote={quote}
            currency={currency}
            onEdit={() => onEditQuote(quote)}
            onAccept={() => onAcceptQuote(quote)}
            onChanged={onChanged}
          />
        ))}
        {declined.length > 0 && (
          <button className="text-xs font-medium text-muted underline" onClick={() => setShowDeclined((v) => !v)}>
            {showDeclined ? "Hide" : "Show"} declined quotes ({declined.length})
          </button>
        )}
        {showDeclined &&
          declined.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              currency={currency}
              onEdit={() => onEditQuote(quote)}
              onAccept={() => onAcceptQuote(quote)}
              onChanged={onChanged}
            />
          ))}
      </div>
    </Card>
  );
}
