// Jobspark service worker: shows the job alerts the API pushes (E27) and
// opens the app where the notification points. Nothing is cached here.

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))

self.addEventListener("push", (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : "" }
  }

  const title = payload.title || "Jobspark"
  event.waitUntil(
    self.registration.showNotification(title, {
      badge: "/icon.svg",
      body: payload.body || "",
      data: { url: payload.url || "/notifications" },
      icon: "/icon.svg",
      // A newer alert replaces the previous one instead of piling up.
      renotify: Boolean(payload.tag),
      tag: payload.tag || undefined,
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || "/notifications", self.location.origin)
  // Only ever open the app itself.
  if (target.origin !== self.location.origin) return

  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => {
      const open = clients.find((client) => new URL(client.url).origin === target.origin)
      if (open) {
        open.focus()
        return open.navigate(target.href)
      }
      return self.clients.openWindow(target.href)
    })
  )
})
