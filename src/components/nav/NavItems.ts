export interface NavItem {
  key: string;
  href: string;
  label: string;
  icon: string;
}

export const ALL_NAV_ITEMS: NavItem[] = [
  { key: "dashboard", href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { key: "tasks", href: "/tasks", label: "Tasks", icon: "✅" },
  { key: "budget", href: "/budget", label: "Budget", icon: "💰" },
  { key: "vendors", href: "/vendors", label: "Vendors", icon: "🤝" },
  { key: "wedding-day", href: "/wedding-day", label: "Wedding Day", icon: "📋" },
  { key: "sharing", href: "/sharing", label: "Sharing", icon: "🔗" },
  { key: "activity", href: "/activity", label: "Activity", icon: "🕘" },
  { key: "settings", href: "/settings", label: "Settings", icon: "⚙️" },
];
