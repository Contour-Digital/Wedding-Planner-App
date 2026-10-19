"use client";

import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils/currency";
import { useSetQuoteStatus } from "./QuoteCard";
import type { ExpenseQuote } from "@/lib/types/database";
import type { CategoryTotals } from "@/lib/types/domain";

// Side-by-side view of every quote still under consideration in one
// category, cheapest first, with how each would leave the category's
// budget if accepted.
export function CompareQuotesModal({
  open,
  onClose,
  category,
  quotes,
  currency,
  onAccept,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  category: CategoryTotals | null;
  quotes: ExpenseQuote[];
  currency?: string;
  onAccept: (quote: ExpenseQuote) => void;
  onChanged: () => void;
}) {
  const setQuoteStatus = useSetQuoteStatus();
  const sorted = [...quotes].sort((a, b) => a.amount - b.amount);
  const cheapest = sorted[0]?.amount ?? 0;

  async function decline(quote: ExpenseQuote) {
    await setQuoteStatus(quote, "declined");
    onChanged();
  }

  return (
    <Modal open={open} onClose={onClose} title={`Compare ${category?.name ?? ""} quotes`}>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted">No quotes left to compare.</p>
      ) : (
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="flex gap-3">
            {sorted.map((quote) => {
              const remainingAfter = (category?.remainingAgainstTarget ?? 0) - quote.amount;
              return (
                <div key={quote.id} className="flex w-52 shrink-0 flex-col gap-3 rounded-xl border border-line p-3">
                  <div>
                    <p className="font-medium">{quote.vendor_name}</p>
                    <p className="font-display text-xl font-semibold">{formatCurrency(quote.amount, currency)}</p>
                    <p className="text-xs text-muted">
                      {quote.amount === cheapest
                        ? "Lowest quote"
                        : `${formatCurrency(quote.amount - cheapest, currency)} more than the lowest`}
                    </p>
                  </div>
                  <div className="text-xs">
                    <p className="text-muted">Category budget left if accepted</p>
                    <p className={remainingAfter < 0 ? "font-medium text-danger" : "font-medium"}>
                      {formatCurrency(remainingAfter, currency)}
                    </p>
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="text-muted">Notes</p>
                    <p className="whitespace-pre-line">{quote.notes || "None"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="flex-1 rounded-full border border-primaryStrong bg-primary/10 px-3 py-1 text-xs font-medium text-primaryStrong"
                      onClick={() => onAccept(quote)}
                    >
                      Accept
                    </button>
                    <button
                      className="flex-1 rounded-full border border-line px-3 py-1 text-xs font-medium text-muted"
                      onClick={() => decline(quote)}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
