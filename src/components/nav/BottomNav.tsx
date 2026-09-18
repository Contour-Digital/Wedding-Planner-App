"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { ALL_NAV_ITEMS, PRIMARY_NAV_KEYS } from "./NavItems";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { visibleNavSections } from "@/lib/utils/permissions";

// Mobile-first bottom tab bar. Always the same 5 primary sections for
// everyone else — Vendors, Sharing, Activity and Settings live in the
// hamburger menu (MobileMenu) instead, so this bar never gets cramped and
// stays a fixed, memorable layout. Timeline Only has so few sections to
// begin with (Dashboard, Wedding Day, Contacts) that all of them fit
// directly in the bar instead, rather than burying Contacts a tap deeper
// in the hamburger menu the way it is for every other role.
const TIMELINE_ONLY_PRIMARY_NAV_KEYS = ["dashboard", "wedding-day", "contacts"];

export function BottomNav() {
  const pathname = usePathname();
  const { role } = useWedding();
  const visible = visibleNavSections(role);
  const primaryKeys = role === "timeline_viewer" ? TIMELINE_ONLY_PRIMARY_NAV_KEYS : PRIMARY_NAV_KEYS;
  const items = ALL_NAV_ITEMS.filter((item) => primaryKeys.includes(item.key) && visible.includes(item.key));

  return (
    // pb includes the safe-area inset so the bar (and its labels) clear the
    // home-indicator / rounded-corner area on notched phones instead of
    // sitting flush against — and getting clipped by — the screen edge.
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden"
      style={{ paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}
    >
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={clsx(
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-3 text-center text-[11px] font-medium leading-tight",
              active ? "text-primaryStrong" : "text-muted"
            )}
          >
            <Icon className="h-6 w-6 shrink-0" />
            <span className="w-full truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
