const FALLBACK_TITLE = "Flexoverse";
self.addEventListener("push", event => {
  event.waitUntil((async () => {
    let payload = {};
    try {
      payload = event.data ? event.data.json() : {};
    } catch {
      payload = { body: event.data?.text() || "You have a new update." };
    }
    const title = String(payload.title || FALLBACK_TITLE);
    const body = String(payload.body || "You have a new update.");
    const url = typeof payload.url === "string" && payload.url.startsWith("/")
      ? payload.url
      : "/";
    await self.registration.showNotification(title, {
      body,
      tag: payload.id ? "flexoverse-" + payload.id : "flexoverse-update",
      renotify: false,
      data: { url },
    });
  })());
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil((async () => {
    const target = new URL(
      typeof event.notification.data?.url === "string" ? event.notification.data.url : "/",
      self.location.origin,
    );
    if (target.origin !== self.location.origin) return;
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("focus" in client) {
        if (client.url !== target.href && "navigate" in client) await client.navigate(target.href);
        return client.focus();
      }
    }
    return self.clients.openWindow(target.href);
  })());
});
