"use client";

import { useEffect, useState } from "react";
import { CloseIcon } from "./ui/icons";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "wedding-planner-install-dismissed";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * A custom "Add to Home Screen" banner, mobile-only (sm:hidden — the app
 * shell only ever wants this on a phone-sized viewport). Android/Chrome fire
 * `beforeinstallprompt`, which we capture and trigger from our own button —
 * the browser suppresses its own mini-infobar once a page does this. iOS
 * Safari has no such event or programmatic install API at all, so instead we
 * show static instructions for the manual Share -> Add to Home Screen flow.
 * Dismissal is remembered per-device via localStorage so it doesn't nag on
 * every visit; if storage is blocked (private browsing), it just re-offers
 * next time, which is a harmless fallback rather than a broken one.
 */
export function InstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  // Registering a service worker (even a no-op one) is part of Chrome's
  // installability criteria — without it, `beforeinstallprompt` never fires.
  // Runs unconditionally, independent of the banner's own visibility logic.
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-fatal — worst case, no Android install prompt; iOS instructions
        // (which don't depend on this) still work.
      });
    }
  }, []);

  useEffect(() => {
    if (isStandalone()) return;

    let alreadyDismissed = false;
    try {
      alreadyDismissed = localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      // Private browsing / blocked storage — proceed as if not dismissed.
    }
    if (alreadyDismissed) return;

    setDismissed(false);

    if (isIOS()) {
      setShowIOSInstructions(true);
      return;
    }

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Ignore — worst case it's offered again next visit.
    }
  }

  async function install() {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    await deferredEvent.userChoice;
    setDeferredEvent(null);
    dismiss();
  }

  if (dismissed || (!showIOSInstructions && !deferredEvent)) return null;

  return (
    <div className="no-print fixed inset-x-3 bottom-20 z-50 sm:hidden">
      <div className="flex items-start gap-3 rounded-2xl border border-line bg-white p-3.5 shadow-lg">
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink">Add to Home Screen</p>
          <p className="mt-0.5 text-xs text-muted">
            {showIOSInstructions
              ? 'Tap the Share icon below, then "Add to Home Screen" — one tap and you\'re in, like a real app.'
              : "Install this app on your phone for one-tap access, just like a native app."}
          </p>
          {!showIOSInstructions && (
            <button
              onClick={install}
              className="mt-2.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-onPrimary hover:opacity-90"
            >
              Install
            </button>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-line"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
