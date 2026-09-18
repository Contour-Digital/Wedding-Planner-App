// Minimal service worker. Its main job is to satisfy the browser's PWA
// installability requirement (a registered service worker with a fetch
// handler) so "Add to Home Screen" / beforeinstallprompt becomes available —
// and, now, to receive and display Web Push notifications (see
// src/lib/push/subscribe.ts and src/lib/server/push.ts).
// It intentionally does NOT cache anything — this app's data is live via
// Supabase, and a cached, stale response would be actively wrong here.
self.addEventListener("fetch", () => {
  // No-op: every request just falls through to the network as normal.
});

self.addEventListener("push", (event) => {
  let data = { title: "Wedding Planner", body: "" };
  try {
    if (event.data) data = event.data.json();
  } catch {
    if (event.data) data = { title: "Wedding Planner", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Wedding Planner", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => new URL(c.url).pathname === url);
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
