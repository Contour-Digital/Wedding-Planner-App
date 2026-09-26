"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/nav/Sidebar";
import { BottomNav } from "@/components/nav/BottomNav";
import { useWedding, getCachedWeddingLabel } from "@/lib/wedding/WeddingProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, wedding, loading, weddingIds } = useWedding();
  const router = useRouter();
  // Read once on mount rather than every render — this only ever needs to
  // reflect whatever was cached before this page load started.
  const [cachedLabel] = useState(getCachedWeddingLabel);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (weddingIds.length === 0) {
      router.replace("/onboarding");
    }
  }, [loading, user, weddingIds, router]);

  if (loading || !user || !wedding) {
    // wedding.partner_1/partner_2 themselves aren't available yet here —
    // this is exactly the screen shown while that fetch is still in
    // flight — so the greeting falls back to whichever wedding's name
    // was cached the last time one loaded successfully, if any.
    const label = wedding ? `${wedding.partner_1} & ${wedding.partner_2}` : cachedLabel;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
        <h1 className="font-display text-3xl font-semibold text-ink">{label ?? "Wedding Planner"}</h1>
        <div className="flex flex-col items-center gap-3 text-sm text-muted">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-primaryStrong"
            aria-hidden="true"
          />
          <p>Loading your wedding…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {/* min-w-0 overrides the flex default of min-width: auto — without
          it, a flex item never shrinks below its content's natural width,
          so any unwrapped content deep inside (e.g. Inspiration's
          horizontally-scrolling category pill row) pushes this whole
          element, and the page along with it, wider than the viewport
          instead of scrolling contained within just that one row. */}
      <main className="min-w-0 flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
