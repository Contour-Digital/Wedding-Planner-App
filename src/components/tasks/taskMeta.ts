import type { TaskCategory } from "@/lib/types/database";

export const TASK_CATEGORY_LABEL: Record<TaskCategory, string> = {
  general: "General",
  vendors: "Vendors",
  guests: "Guests",
  wedding_day: "Wedding Day",
  attire: "Attire",
  payments: "Payments",
  documents: "Documents",
};

export const TASK_CATEGORY_OPTIONS: TaskCategory[] = [
  "general",
  "vendors",
  "guests",
  "wedding_day",
  "attire",
  "payments",
  "documents",
];
