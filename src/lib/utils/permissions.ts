import type { WeddingRole } from "@/lib/types/database";

export const ROLE_LABEL: Record<WeddingRole, string> = {
  owner: "Full Access (Owner)",
  editor: "Full Access",
  timeline_viewer: "Timeline Only",
  viewer: "View Only",
};

export const ROLE_DESCRIPTION: Record<WeddingRole, string> = {
  owner: "Can see and edit everything, and manage who has access.",
  editor: "Can see and edit everything.",
  timeline_viewer: "Can only view the shared Wedding Day run sheet. No financials, no private notes.",
  viewer: "Can view planning information but cannot make changes. No financial data.",
};

export function canEdit(role: WeddingRole | null | undefined) {
  return role === "owner" || role === "editor";
}

export function canManageMembers(role: WeddingRole | null | undefined) {
  return role === "owner";
}

export function canSeeFinancials(role: WeddingRole | null | undefined) {
  return role === "owner" || role === "editor";
}

export function canSeeVendorsAndTasks(role: WeddingRole | null | undefined) {
  return role === "owner" || role === "editor" || role === "viewer";
}

export function isTimelineOnly(role: WeddingRole | null | undefined) {
  return role === "timeline_viewer";
}

// Nav items visible per role. This mirrors — but does not replace — the
// database RLS policies, which are the real enforcement layer.
export function visibleNavSections(role: WeddingRole | null | undefined): string[] {
  if (role === "timeline_viewer") {
    return ["wedding-day"];
  }
  if (role === "viewer") {
    return ["dashboard", "tasks", "vendors", "wedding-day", "activity"];
  }
  // owner / editor
  return ["dashboard", "tasks", "budget", "vendors", "wedding-day", "sharing", "activity", "settings"];
}
