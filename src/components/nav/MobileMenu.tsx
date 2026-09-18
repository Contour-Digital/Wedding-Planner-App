"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ALL_NAV_ITEMS } from "./NavItems";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { createClient } from "@/lib/supabase/client";
import { visibleNavSections } from "@/lib/utils/permissions";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";

// Everything that isn't one of the 5 primary bottom-tab sections lives here
// on mobile: Vendors, Contacts, Sharing, Activity, Settings, plus Sign out.
// Replaces the plain "Sign out" button in the mobile header. Desktop keeps
// its own sign-out button in Header — the Sidebar already shows every
// section as a full list, so a second menu would be redundant there.
const MENU_KEYS = ["vendors", "contacts", "sharing", "activity", "settings"];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { role } = useWedding();
  const router = useRouter();
  const supabase = createClient();

  const visible = visibleNavSections(role);
  const items = ALL_NAV_ITEMS.filter((item) => MENU_KEYS.includes(item.key) && visible.includes(item.key));

  async function signOut() {
    setOpen(false);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="relative sm:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-onPrimaryLine text-onPrimary"
      >
        {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
      </button>

      {open && (
        <>
          {/* Invisible full-screen tap target to close the menu when tapping outside it. */}
          <button
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
            {items.length > 0 && (
              <nav className="flex flex-col p-1.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-line"
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            )}
            <div className={items.length > 0 ? "border-t border-line p-1.5" : "p-1.5"}>
              <button
                onClick={signOut}
                className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-danger hover:bg-danger/10"
              >
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
