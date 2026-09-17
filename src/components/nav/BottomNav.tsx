"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { ALL_NAV_ITEMS } from "./NavItems";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { visibleNavSections } from "@/lib/utils/permissions";

// Mobile-first bottom tab bar. Always the same 5 primary sections — Sharing,
// Activity and Settings live in the hamburger menu (MobileMenu) instead, so
// this bar never gets cramped and stays a fixed, memorable layout. A role
// that can't see one of these (e.g. Timeline Only only gets Wedding Day)
// simply gets fewer tabs rather than substituting something else in.
const PRIMARY_KEYS = ["dashboard", "tasks", "budget", "vendors", "wedding-day"];

export function BottomNav() {
  const pathname = usePathname();
  const { role } = useWedding();
  const visible = visibleNavSections(role);
  const items = ALL_NAV_ITEMS.filter((item) => PRIMARY_KEYS.includes(item.key) && visible.includes(item.key));

  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-white/95 backdrop-blur sm:hidden">
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={clsx(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium",
              active ? "text-primaryStrong" : "text-muted"
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
