"use client";

import { useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ALL_NAV_ITEMS, primaryNavKeysFor } from "./NavItems";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { visibleNavSections } from "@/lib/utils/permissions";

// Matches Tailwind's `sm` breakpoint, the same one BottomNav uses to decide
// mobile vs desktop.
const MOBILE_BREAKPOINT_PX = 640;
const MIN_SWIPE_DISTANCE_PX = 60;
const MAX_OFF_AXIS_DRIFT_PX = 60;

// Swipe left/right anywhere in the page content to move between the same
// primary tabs the bottom nav shows, in that order. Mobile-only: a touch
// starting at desktop width, or one that begins inside a modal (dragging a
// date field, selecting text, etc.), never triggers a tab change.
export function SwipeNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role } = useWedding();

  const items = useMemo(() => {
    const visible = visibleNavSections(role);
    const primaryKeys = primaryNavKeysFor(role);
    return ALL_NAV_ITEMS.filter((item) => primaryKeys.includes(item.key) && visible.includes(item.key));
  }, [role]);

  const touchStart = useRef<{ x: number; y: number } | null>(null);

  function onTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    touchStart.current = null;
    if (typeof window === "undefined" || window.innerWidth >= MOBILE_BREAKPOINT_PX) return;
    if ((e.target as HTMLElement).closest("[data-modal-root]")) return;
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < MIN_SWIPE_DISTANCE_PX || Math.abs(dy) > MAX_OFF_AXIS_DRIFT_PX) return;

    const currentIndex = items.findIndex((item) => pathname.startsWith(item.href));
    if (currentIndex === -1) return;

    const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
    const nextItem = items[nextIndex];
    if (nextItem) router.push(nextItem.href);
  }

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="min-h-screen">
      {children}
    </div>
  );
}
