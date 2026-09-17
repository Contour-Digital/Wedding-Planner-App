"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { ALL_NAV_ITEMS } from "./NavItems";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { visibleNavSections } from "@/lib/utils/permissions";

export function Sidebar() {
  const pathname = usePathname();
  const { wedding, role } = useWedding();
  const visible = visibleNavSections(role);
  const items = ALL_NAV_ITEMS.filter((item) => visible.includes(item.key));

  return (
    <aside className="no-print hidden w-60 shrink-0 flex-col border-r border-line bg-white sm:flex">
      <div className="border-b border-line p-5">
        <p className="font-display text-lg font-semibold leading-tight">
          {wedding ? `${wedding.partner_1} & ${wedding.partner_2}` : "Wedding Planner"}
        </p>
        {wedding?.venue && <p className="text-xs text-muted">{wedding.venue}</p>}
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                active ? "bg-primary/10 text-primaryStrong" : "text-ink hover:bg-line"
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
