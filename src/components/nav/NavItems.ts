import type { ComponentType } from "react";
import {
  CalendarIcon,
  ChecklistIcon,
  ClockIcon,
  HomeIcon,
  ImageIcon,
  LinkIcon,
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

// The bottom tab bar's fixed set of primary sections, and the order swiping
// between tabs on mobile follows. Sharing, Activity, Settings and Vendors
// live in the hamburger menu instead, so this stays a short, memorable,
// swipeable row.
export const PRIMARY_NAV_KEYS = ["dashboard", "tasks", "budget", "inspiration", "wedding-day"];

export const ALL_NAV_ITEMS: NavItem[] = [
  { key: "dashboard", href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { key: "tasks", href: "/tasks", label: "Tasks", icon: ChecklistIcon },
  { key: "budget", href: "/budget", label: "Budget", icon: WalletIcon },
  { key: "vendors", href: "/vendors", label: "Vendors", icon: UsersIcon },
  { key: "wedding-day", href: "/wedding-day", label: "Wedding Day", icon: CalendarIcon },
  { key: "inspiration", href: "/inspiration", label: "Inspiration", icon: ImageIcon },
  { key: "sharing", href: "/sharing", label: "Sharing", icon: LinkIcon },
  { key: "activity", href: "/activity", label: "Activity", icon: ClockIcon },
  { key: "settings", href: "/settings", label: "Settings", icon: SettingsIcon },
];
