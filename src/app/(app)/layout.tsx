"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/nav/Sidebar";
import { BottomNav } from "@/components/nav/BottomNav";
import { SwipeNav } from "@/components/nav/SwipeNav";
import { useWedding } from "@/lib/wedding/WeddingProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, wedding, loading, weddingIds } = useWedding();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (weddingIds.length === 0) {
      router.replace("/onboarding");
    }
  }, [loading, user, weddingIds, router]);

  if (loading || !user || !wedding) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Loading your wedding…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-0">
        <SwipeNav>{children}</SwipeNav>
      </main>
      <BottomNav />
    </div>
  );
}
