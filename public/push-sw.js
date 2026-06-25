self.addEventListener('push', (event) => {
  let payload = {}

  if (event.data) {
    try {
      payload = event.data.json()
    } catch {
      payload = { body: event.data.text() }
    }
  }

  const title = typeof payload.title === 'string' ? payload.title : 'Lịch âm Việt Nam'
  const targetUrl = typeof payload.url === 'string' ? payload.url : '/'

  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof payload.body === 'string' ? payload.body : 'Đây là thông báo thử từ PWA.',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: typeof payload.tag === 'string' ? payload.tag : 'lunar-calendar-test',
      data: { url: targetUrl },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const rawUrl = event.notification.data && event.notification.data.url
  const targetUrl = new URL(typeof rawUrl === 'string' ? rawUrl : '/', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (new URL(client.url).origin !== self.location.origin) {
          continue
        }

        if ('navigate' in client) {
          return client.navigate(targetUrl).then((navigatedClient) => {
            if (navigatedClient) {
              return navigatedClient.focus()
            }

            return client.focus()
          })
        }

        return client.focus()
      }

      return self.clients.openWindow(targetUrl)
    }),
  )
})

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const subscription = await self.registration.pushManager.subscribe(
          event.oldSubscription ? event.oldSubscription.options : undefined,
        )

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        })
      } catch {
        // The app will subscribe again on the next foreground open.
      }
    })(),
  )
})
