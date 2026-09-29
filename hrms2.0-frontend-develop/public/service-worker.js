/* public/sw.js */
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => self.clients.claim());

// Handle incoming push payloads
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}

  const title = data.title || "Notification";
  const body = data.body || data.message || "";
  const icon = data.icon || "/icon-192.png";  // put an icon in /public
  const badge = data.badge || "/badge-72.png"; // optional
  const url = data.url || "/"; // used on click

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data: { url }, // we’ll read this on click
      requireInteraction: !!data.requireInteraction, // optional
      tag: data.tag, // optional dedupe tag
    })
  );
});

// Focus an existing tab or open a new one
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/";

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = allClients.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        await existing.focus();
        existing.postMessage({ type: "NAVIGATE", url }); // optional: tell the SPA to route
      } else {
        await clients.openWindow(url);
      }
    })()
  );
});

// (Optional) auto re-subscribe if browser rotates keys
self.addEventListener("pushsubscriptionchange", async (event) => {
  // You can re-subscribe here and POST to your backend again
});
