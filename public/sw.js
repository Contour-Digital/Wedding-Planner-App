// Minimal service worker. Its only job is to satisfy the browser's PWA
// installability requirement (a registered service worker with a fetch
// handler) so "Add to Home Screen" / beforeinstallprompt becomes available.
// It intentionally does NOT cache anything — this app's data is live via
// Supabase, and a cached, stale response would be actively wrong here.
self.addEventListener("fetch", () => {
  // No-op: every request just falls through to the network as normal.
});
