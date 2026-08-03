/*
 * Offline support.
 *
 * Runtime caching rather than a precache manifest: Vite hashes asset
 * filenames, so any hardcoded list would go stale on the next build and
 * silently serve a broken shell.
 *
 * Navigations are network-first so a deploy is picked up immediately; static
 * assets are cache-first because a hashed filename can never change content.
 */

const CACHE = 'ritual-v1'

self.addEventListener('install', (event) => {
  // Take over straight away — there is only ever one client, and waiting for
  // every tab to close before a fix lands is the wrong trade here.
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request)
          const cache = await caches.open(CACHE)
          cache.put(request, response.clone())
          return response
        } catch {
          // Offline: serve the shell so the app still opens in the gym.
          const cached = await caches.match(request)
          return cached ?? (await caches.match(new URL('./', self.location.href).href)) ?? Response.error()
        }
      })(),
    )
    return
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request)
      if (cached) return cached
      try {
        const response = await fetch(request)
        if (response.ok) {
          const cache = await caches.open(CACHE)
          cache.put(request, response.clone())
        }
        return response
      } catch {
        return Response.error()
      }
    })(),
  )
})
