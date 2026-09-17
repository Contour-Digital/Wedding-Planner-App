"use client";

import { useRouter } from "next/navigation";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { createClient } from "@/lib/supabase/client";
import { weddingCountdown } from "@/lib/utils/date";
import { MobileMenu } from "./MobileMenu";

export function Header({ title }: { title: string }) {
  const { wedding } = useWedding();
  const router = useRouter();
  const supabase = createClient();
  const countdown = weddingCountdown(wedding?.wedding_date);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-[#FBF8F5]/90 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">{title}</h1>
          {wedding?.venue && (
            <p className="text-xs text-muted">
              {wedding.venue}
              {wedding.location ? `, ${wedding.location}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {countdown !== null && countdown >= 0 && (
            <div className="hidden text-right sm:block">
              <p className="text-lg font-semibold leading-none text-primaryStrong">{countdown}</p>
              <p className="text-[11px] text-muted">days to go</p>
            </div>
          )}
          {/* Desktop: Sidebar already lists every section, so a plain sign-out
              button is enough here. Mobile: Sharing/Activity/Settings have no
              other home once they're off the bottom bar, so they move into
              this hamburger menu alongside Sign out. */}
          <button
            onClick={signOut}
            className="hidden rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted hover:bg-line sm:inline-block"
          >
            Sign out
          </button>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
