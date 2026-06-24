// Web Push handlers (§4.5.4). Imported into the Workbox-generated service worker
// via vite-plugin-pwa's `workbox.importScripts`. Kept framework-free since it runs
// in the SW global scope.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Arc";
  // Medication reminders carry one-tap actions (arc.dc.html §09 lock screen). The
  // actions deep-link into the medicine screen to mark the dose, since marking
  // needs the signed-in session which isn't available in the worker.
  const actions =
    data.tag === "medication"
      ? [
          { action: "taken", title: "Taken" },
          { action: "skip", title: "Skip" },
        ]
      : [];
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      tag: data.tag,
      data: { url: data.url || "/" },
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      actions,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Both the "Taken" and "Skip" actions open the medicine screen to finish the
  // action; a plain tap opens the notification's deep link.
  const url =
    event.action === "taken" || event.action === "skip"
      ? "/log/medicine"
      : (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const c of wins) {
        if (c.url.includes(url) && "focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })(),
  );
});
