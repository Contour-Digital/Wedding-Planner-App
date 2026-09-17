"use client";

import { useEffect } from "react";
import { useWedding } from "@/lib/wedding/WeddingProvider";
import { accessibleForegroundOnLight, bestTextOn, isValidHex } from "@/lib/utils/color";

/**
 * Applies the couple's own Primary/Secondary colours (Settings) as CSS
 * custom properties on the document root, so the whole app re-themes live —
 * without ever risking unreadable text. Two derived tokens do the safety
 * work:
 *   --color-primary-strong : the user's primary hue, darkened just enough to
 *                              stay legible as TEXT on white (links, active
 *                              nav labels, timestamps)
 *   --color-on-primary      : black or white, whichever reads better as text
 *                              ON a solid primary-coloured fill (buttons,
 *                              the dashboard countdown card)
 * Setting these via inline styles on <html> overrides the static fallback
 * values in globals.css (used pre-login, before any wedding is loaded).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { wedding } = useWedding();

  useEffect(() => {
    const root = document.documentElement;
    const primary = wedding?.primary_colour;
    const secondary = wedding?.secondary_colour;

    if (primary && isValidHex(primary)) {
      root.style.setProperty("--color-primary", primary);
      root.style.setProperty("--color-primary-strong", accessibleForegroundOnLight(primary));
      root.style.setProperty("--color-on-primary", bestTextOn(primary));
    }
    if (secondary && isValidHex(secondary)) {
      root.style.setProperty("--color-secondary", secondary);
    }

    return () => {
      // Wedding switched or provider unmounted — fall back to the defaults
      // in globals.css rather than leaving a stale theme applied.
      root.style.removeProperty("--color-primary");
      root.style.removeProperty("--color-primary-strong");
      root.style.removeProperty("--color-on-primary");
      root.style.removeProperty("--color-secondary");
    };
  }, [wedding?.primary_colour, wedding?.secondary_colour]);

  return <>{children}</>;
}
