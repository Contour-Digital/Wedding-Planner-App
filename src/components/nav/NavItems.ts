import type { ComponentType } from "react";
import type { WeddingRole } from "@/lib/types/database";
import {
  BellIcon,
  CalendarIcon,
  ChecklistIcon,
  ClockIcon,
  HomeIcon,
  ImageIcon,
  LinkIcon,
  NoteIcon,
  PhoneIcon,
  SettingsIcon,
  UsersIcon,
  WalletIcon,
  type IconProps,
} from "@/components/ui/icons";

export interface NavItem {
  key: string;
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
}

// The bottom tab bar's fixed set of primary sections. Dashboard moved out to
// a header shortcut (see Header.tsx) to make room for Notes — Sharing,
// Activity, Settings and Vendors still live in the hamburger menu instead,
// so this stays a short, memorable row.
export const PRIMARY_NAV_KEYS = ["tasks", "budget", "notes", "inspiration", "wedding-day"];

// Timeline Only has so few sections to begin with (Dashboard, Wedding Day,
// Contacts) that all of them fit directly in the bar instead, rather than
// burying Contacts a tap deeper in the hamburger menu the way it is for
// every other role — Dashboard stays here for that role instead of moving
// to the header shortcut (see Header.tsx), since there's no crowding to
// relieve.
export const TIMELINE_ONLY_PRIMARY_NAV_KEYS = ["dashboard", "wedding-day", "contacts"];

export function primaryNavKeysFor(role: WeddingRole | null | undefined) {
  return role === "timeline_viewer" ? TIMELINE_ONLY_PRIMARY_NAV_KEYS : PRIMARY_NAV_KEYS;
}

export const ALL_NAV_ITEMS: NavItem[] = [
  { key: "dashboard", href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { key: "tasks", href: "/tasks", label: "Tasks", icon: ChecklistIcon },
  { key: "budget", href: "/budget", label: "Budget", icon: WalletIcon },
  { key: "vendors", href: "/vendors", label: "Vendors", icon: UsersIcon },
  { key: "wedding-day", href: "/wedding-day", label: "Wedding Day", icon: CalendarIcon },
  { key: "notes", href: "/notes", label: "Notes", icon: NoteIcon },
  { key: "inspiration", href: "/inspiration", label: "Inspiration", icon: ImageIcon },
  { key: "contacts", href: "/contacts", label: "Contacts", icon: PhoneIcon },
  { key: "sharing", href: "/sharing", label: "Sharing", icon: LinkIcon },
  { key: "activity", href: "/activity", label: "Activity", icon: ClockIcon },
  { key: "settings", href: "/settings", label: "Settings", icon: SettingsIcon },
  { key: "notifications", href: "/notifications", label: "Notifications", icon: BellIcon },
];
