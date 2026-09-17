// Colour math for turning a couple's freely-chosen brand colour into a full,
// accessible set of theme tokens at runtime. Wherever a colour picked by a
// user is used as TEXT (links, active nav labels) or as a solid fill with
// overlaid text (buttons, badges), we can't just trust the raw hex — a light
// pastel primary with white text, or a dark primary with dark text, would be
// unreadable. Everything here exists to guarantee WCAG AA (4.5:1) wherever
// text sits on a colour the user chose.

interface RGB {
  r: number;
  g: number;
  b: number;
}

export function isValidHex(value: string): boolean {
  return /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(value.trim());
}

export function normalizeHex(value: string): string {
  const v = value.trim();
  if (/^#([0-9A-Fa-f]{3})$/.test(v)) {
    return "#" + v.slice(1).split("").map((c) => c + c).join("");
  }
  return v;
}

function hexToRgb(hex: string): RGB {
  const clean = normalizeHex(hex).replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function relativeLuminance({ r, g, b }: RGB): number {
  const linear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexToRgb(hexA));
  const lB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

// RGB <-> HSL, so we can nudge lightness while preserving the user's hue and
// saturation (a straight "darken by multiplying RGB" shifts the hue too).
function rgbToHsl({ r, g, b }: RGB): { h: number; s: number; l: number } {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn),
    min = Math.min(rn, gn, bn);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    switch (max) {
      case rn:
        h = ((gn - bn) / d) % 6;
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

/**
 * Given any hex colour used as a solid fill (a button, a badge, the
 * countdown card), returns whichever of near-black / near-white gives
 * stronger contrast — the standard "pick readable text for this swatch"
 * approach used by design tools' colour pickers.
 */
export function bestTextOn(hex: string): string {
  if (!isValidHex(hex)) return "#2A2E28";
  const dark = "#2A2E28";
  const light = "#FFFFFF";
  return contrastRatio(hex, dark) >= contrastRatio(hex, light) ? dark : light;
}

/**
 * Given a hex colour meant to be used as TEXT on a light (near-white)
 * background — links, active nav labels — nudges its lightness in HSL space
 * until it clears the given contrast ratio against white, while keeping the
 * user's chosen hue and saturation intact. This is what makes an arbitrary
 * pastel "primary" colour still legible as link/label text.
 */
export function accessibleForegroundOnLight(hex: string, minContrast = 4.6): string {
  if (!isValidHex(hex)) return "#56634F";
  const white = "#FFFFFF";
  let { h, s, l } = rgbToHsl(hexToRgb(hex));

  // Walk lightness down in small steps until contrast clears the bar, or we
  // hit near-black (should always succeed well before then).
  for (let i = 0; i < 40; i++) {
    const candidate = rgbToHex(hslToRgb(h, s, l));
    if (contrastRatio(candidate, white) >= minContrast) return candidate;
    l = Math.max(0, l - 0.025);
  }
  return "#1A1D18";
}

export { hexToRgb, rgbToHex };
