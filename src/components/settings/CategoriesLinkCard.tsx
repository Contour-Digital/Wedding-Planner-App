import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

// The actual category manager (rename, targets, remove, add) moved to its
// own unlisted page — /budget/categories — since it's really a Budget
// concern. This stays here, in the same spot, purely so it's still
// findable from Settings.
export function CategoriesLinkCard() {
  return (
    <Card className="space-y-3">
      <div>
        <h3 className="font-display text-lg font-semibold">Expense categories</h3>
        <p className="mt-1 text-xs text-muted">
          Rename categories, set their budget targets, or add and remove them.
        </p>
      </div>
      <Link href="/budget/categories">
        <Button variant="secondary">Manage categories</Button>
      </Link>
    </Card>
  );
}
