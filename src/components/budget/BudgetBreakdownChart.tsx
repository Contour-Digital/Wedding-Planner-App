import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils/currency";
import type { CategoryTotals } from "@/lib/types/domain";

// Ranked horizontal bars, one per category with any committed spend,
// longest first — reuses the same bg-line track / bg-primary fill / rounded
// pill the per-category ProgressBar already uses elsewhere on this page, so
// it reads as the same visual language rather than a bolted-on chart
// widget. One measure (committed spend) across already-labelled categories,
// so identity comes from the text label, not from color — no need for a
// multi-hue categorical palette here.
export function BudgetBreakdownChart({ categories, currency }: { categories: CategoryTotals[]; currency?: string }) {
  const withSpend = categories.filter((c) => c.committed > 0).sort((a, b) => b.committed - a.committed);
  if (withSpend.length === 0) return null;

  const max = Math.max(...withSpend.map((c) => c.committed));

  return (
    <Card className="space-y-3">
      <h3 className="font-display text-lg font-semibold">Spend by category</h3>
      <div className="space-y-3">
        {withSpend.map((c) => (
          <div key={c.categoryId ?? c.name} title={`${c.name}: ${formatCurrency(c.committed, currency)} committed`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-ink">{c.name}</span>
              <span className="shrink-0 text-xs text-muted">{formatCurrency(c.committed, currency)}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${max > 0 ? (c.committed / max) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
