"use client";

import Link from "next/link";
import { PageHeader } from "@/components/nav/PageHeader";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { CategoryManager } from "@/components/budget/CategoryManager";
import { canEdit } from "@/lib/utils/permissions";

// Not in the main nav or hamburger menu — reached via the "Manage
// categories" link at the bottom of Budget, or from Settings (same pattern
// as /budget/upcoming, /wedding-day/print, /export/binder).
export default function ExpenseCategoriesPage() {
  const { role } = useWedding();

  if (!canEdit(role)) {
    return (
      <div>
        <PageHeader title="Expense Categories" />
        <p className="p-6 text-sm text-muted">Budget information is only visible to the couple.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Expense Categories" />
      <div className="space-y-6 p-4 sm:p-6">
        <CategoryManager />
        <Link href="/budget" className="inline-block text-sm font-medium text-primaryStrong">
          ← Back to Budget
        </Link>
      </div>
    </div>
  );
}
