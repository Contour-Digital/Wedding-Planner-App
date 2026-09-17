// Default expense categories offered during onboarding, and a rough
// Australian-wedding cost estimator used to pre-fill target budgets from
// guest count. This is a starting point, not a market survey — every figure
// it produces is just a plain number in a normal input, editable immediately
// on the same screen and again later from Settings.
//
// Basis: a commonly cited all-up Australian wedding cost works out to
// roughly $250-$320 per guest; we use $275/guest as the reference total,
// then split it across categories using typical percentage allocations
// (venue and catering together make up about half of a typical budget).
export const DEFAULT_EXPENSE_CATEGORIES = [
  "Venue",
  "Food & Drink",
  "Photography",
  "Videography",
  "Attire",
  "Flowers",
  "Entertainment",
  "Transport",
  "Stationery",
  "Accommodation",
  "Other",
] as const;

export const AU_AVERAGE_COST_PER_GUEST = 275;

export const CATEGORY_BUDGET_SHARE: Record<string, number> = {
  "Venue": 0.25,
  "Food & Drink": 0.25,
  "Photography": 0.1,
  "Videography": 0.05,
  "Attire": 0.08,
  "Flowers": 0.06,
  "Entertainment": 0.08,
  "Transport": 0.03,
  "Stationery": 0.02,
  "Accommodation": 0.04,
  "Other": 0.04,
};

/** Rounds to the nearest $10 so pre-filled figures don't look falsely precise. */
export function estimateCategoryBudget(categoryName: string, guestCount: number): number {
  const share = CATEGORY_BUDGET_SHARE[categoryName] ?? 0;
  const estimatedTotal = Math.max(guestCount, 0) * AU_AVERAGE_COST_PER_GUEST;
  return Math.round((estimatedTotal * share) / 10) * 10;
}
