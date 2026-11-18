// Built by the serviceWorker plugin in vite.config.ts, which prepends VERSION and PRECACHE.
/* global VERSION, PRECACHE */

const STATIC = `static-${VERSION}`
const RUNTIME = "runtime"
// Cap on cached API responses: some request URLs contain timestamps and would pile up.
const RUNTIME_LIMIT = 80
const NAVIGATE_TIMEOUT = 3000

self.addEventListener("install", (event) => {
  // Default cache mode: reuse what the page already downloaded from the HTTP cache instead of fetching twice.
  event.waitUntil(
    caches
      .open(STATIC)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith("static-") && k !== STATIC).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith("/_/")) return

  if (url.pathname.startsWith("/api/")) {
    // Public data only, and only without auth: per-user responses (own reports, moderation queue) must not
    // land in the shared cache.
    const open = url.pathname === "/api/eco/home" || /^\/api\/collections\/[^/]+\/records$/.test(url.pathname)
    if (!open || request.headers.has("Authorization")) return
    event.respondWith(networkFirst(request))
    return
  }
  if (request.mode === "navigate") {
    event.respondWith(navigate(request))
    return
  }
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request))
    return
  }
  event.respondWith(staleWhileRevalidate(request))
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(STATIC)
    void cache.put(request, response.clone())
  }
  return response
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC)
  const cached = await cache.match(request)
  const fresh = fetch(request)
    .then((response) => {
      if (response.ok) void cache.put(request, response.clone())
      return response
    })
    .catch(() => null)
  return cached ?? (await fresh) ?? Response.error()
}

async function navigate(request) {
  const cache = await caches.open(STATIC)
  const fresh = fetch(request).then((response) => {
    if (response.ok) void cache.put("/", response.clone())
    return response
  })
  const slow = new Promise((_, reject) => setTimeout(reject, NAVIGATE_TIMEOUT))
  try {
    return await Promise.race([fresh, slow])
  } catch {
    fresh.catch(() => {})
    return (await cache.match("/")) ?? fresh
  }
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME)
  try {
    const response = await fetch(request)
    if (response.ok) void cache.put(request, response.clone()).then(() => trim(cache))
    return response
  } catch (error) {
    const cached = await cache.match(request)
    if (cached) return cached
    throw error
  }
}

async function trim(cache) {
  const keys = await cache.keys()
  await Promise.all(keys.slice(0, Math.max(0, keys.length - RUNTIME_LIMIT)).map((k) => cache.delete(k)))
}
