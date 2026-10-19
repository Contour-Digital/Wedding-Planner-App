"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { logActivity } from "@/lib/activity/logActivity";
import { formatCurrency } from "@/lib/utils/currency";
import type { ExpenseQuote, QuoteStatus } from "@/lib/types/database";

// Decline hides a quote from its category without deleting it; restore
// puts a declined one back under consideration. Shared by the quote card
// and the compare view.
export function useSetQuoteStatus() {
  const { wedding, user } = useWedding();
  const supabase = createClient();

  return async function setQuoteStatus(quote: ExpenseQuote, status: Extract<QuoteStatus, "considering" | "declined">) {
    await supabase
      .from("expense_quotes")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", quote.id);

    if (wedding && user) {
      await logActivity(supabase, {
        weddingId: wedding.id,
        userId: user.id,
        actionType: status === "declined" ? "quote.declined" : "quote.restored",
        description:
          status === "declined"
            ? `Declined the quote from ${quote.vendor_name}.`
            : `Moved the quote from ${quote.vendor_name} back to considering.`,
        entityType: "expense_quote",
        entityId: quote.id,
      });
    }
  };
}

const pillClass =
  "rounded-full border border-primaryStrong bg-primary/10 px-3 py-0.5 text-xs font-medium text-primaryStrong";

export function QuoteCard({
  quote,
  currency,
  onEdit,
  onAccept,
  onChanged,
}: {
  quote: ExpenseQuote;
  currency?: string;
  onEdit: () => void;
  onAccept: () => void;
  onChanged: () => void;
}) {
  const setQuoteStatus = useSetQuoteStatus();
  const declined = quote.status === "declined";

  async function changeStatus(status: "considering" | "declined") {
    await setQuoteStatus(quote, status);
    onChanged();
  }

  return (
    // Dashed and faded so a quote reads as "not money we've committed"
    // next to the solid expense cards above it.
    <div className={`rounded-xl border border-dashed border-line p-4 ${declined ? "opacity-50" : "opacity-80"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-muted">
            {quote.vendor_id ? (
              <Link href={`/vendors/${quote.vendor_id}`} className="underline">
                {quote.vendor_name}
              </Link>
            ) : (
              quote.vendor_name
            )}
          </p>
          <p className="text-xs text-muted">{declined ? "Declined" : "Quote, considering"}</p>
        </div>
        <p className="font-semibold text-muted">{formatCurrency(quote.amount, currency)}</p>
      </div>

      {quote.notes && <p className="mt-2 whitespace-pre-line text-xs text-muted">{quote.notes}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {declined ? (
          <button className={pillClass} onClick={() => changeStatus("considering")}>
            Restore
          </button>
        ) : (
          <>
            <button className={pillClass} onClick={onAccept}>
              Accept
            </button>
            <button
              className="rounded-full border border-line px-3 py-0.5 text-xs font-medium text-muted"
              onClick={() => changeStatus("declined")}
            >
              Decline
            </button>
          </>
        )}
        <button className="rounded-full border border-line px-3 py-0.5 text-xs font-medium text-muted" onClick={onEdit}>
          Edit
        </button>
      </div>
    </div>
  );
}
