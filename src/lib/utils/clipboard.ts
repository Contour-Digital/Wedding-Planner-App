// Best-effort clipboard write — the Clipboard API can be blocked (some
// in-app/PWA webviews, non-HTTPS contexts), so callers should still show
// the text on a failed copy rather than silently doing nothing.
export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
