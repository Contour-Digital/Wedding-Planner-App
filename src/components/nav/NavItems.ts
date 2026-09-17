import type { ComponentType } from "react";
import {
  CalendarIcon,
  ChecklistIcon,
  ClockIcon,
  HomeIcon,
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

export const ALL_NAV_ITEMS: NavItem[] = [
  { key: "dashboard", href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { key: "tasks", href: "/tasks", label: "Tasks", icon: ChecklistIcon },
  { key: "budget", href: "/budget", label: "Budget", icon: WalletIcon },
  { key: "vendors", href: "/vendors", label: "Vendors", icon: UsersIcon },
  { key: "wedding-day", href: "/wedding-day", label: "Wedding Day", icon: CalendarIcon },
  { key: "sharing", href: "/sharing", label: "Sharing", icon: LinkIcon },
  { key: "activity", href: "/activity", label: "Activity", icon: ClockIcon },
  { key: "settings", href: "/settings", label: "Settings", icon: SettingsIcon },
];
