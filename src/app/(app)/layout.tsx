"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/nav/Sidebar";
import { BottomNav } from "@/components/nav/BottomNav";
import { SwipeNav } from "@/components/nav/SwipeNav";
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-sm text-muted">
        <Image
          src="/icon-192.png"
          alt=""
          width={80}
          height={80}
          priority
          className="animate-breathe rounded-2xl shadow-lg"
        />
        <p>{label ? `Loading ${label}'s wedding…` : "Loading your wedding…"}</p>
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
        <SwipeNav>{children}</SwipeNav>
      </main>
      <BottomNav />
    </div>
  );
}
