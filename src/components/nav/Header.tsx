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
    <>
      {/* Solid brand-colour bar. Fixed height (h-20) matches the Sidebar's
          own top block exactly, so their bottom borders line up in one
          straight line where the two meet at the sidebar/content seam —
          they used to drift out of alignment because each had different
          vertical padding. */}
      <header className="no-print sticky top-0 z-30 flex h-20 items-center border-b border-line bg-primary">
        <div className="flex w-full items-center justify-between px-4 sm:px-6">
          {/* Desktop: page title + venue, as before. */}
          <div className="hidden sm:block">
            <h1 className="font-display text-xl font-semibold text-onPrimary">{title}</h1>
            {wedding?.venue && (
              <p className="text-xs text-onPrimaryMuted">
                {wedding.venue}
                {wedding.location ? `, ${wedding.location}` : ""}
              </p>
            )}
          </div>
          {/* Mobile: couple's name + venue instead of the page title — the
              title itself moves into the page below, ahead of its content. */}
          <div className="sm:hidden">
            <h1 className="font-display text-lg font-semibold leading-tight text-onPrimary">
              {wedding ? `${wedding.partner_1} & ${wedding.partner_2}` : "Wedding Planner"}
            </h1>
            {wedding?.venue && (
              <p className="text-xs text-onPrimaryMuted">
                {wedding.venue}
                {wedding.location ? `, ${wedding.location}` : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {countdown !== null && countdown >= 0 && (
              <div className="hidden text-right sm:block">
                <p className="text-lg font-semibold leading-none text-onPrimary">{countdown}</p>
                <p className="text-[11px] text-onPrimaryMuted">days to go</p>
              </div>
            )}
            {/* Desktop: Sidebar already lists every section, so a plain sign-out
                button is enough here. Mobile: Sharing/Activity/Settings have no
                other home once they're off the bottom bar, so they move into
                this hamburger menu alongside Sign out. */}
            <button
              onClick={signOut}
              className="hidden rounded-full border border-onPrimaryLine px-3 py-1.5 text-xs font-medium text-onPrimary hover:bg-onPrimaryLine sm:inline-block"
            >
              Sign out
            </button>
            <MobileMenu />
          </div>
        </div>
      </header>
      {/* Mobile-only: the page title, moved out of the sticky header and
          placed as an ordinary heading at the top of the page content
          instead — it scrolls away with the page rather than staying fixed. */}
      <div className="border-b border-line bg-white px-4 py-3 sm:hidden">
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      </div>
    </>
  );
}
