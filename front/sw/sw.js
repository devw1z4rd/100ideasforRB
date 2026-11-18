// Service worker сайта (CLAUDE.md §6 «Загрузка главной»). Собирается плагином serviceWorker в vite.config.ts:
// он дописывает сверху VERSION и PRECACHE (JS, CSS, шрифты, слои карты, страница). Задачи:
// повторный визит — код и шрифты с диска, без сети; нет интернета (защита, §15) — сайт открывается
// с последними загруженными данными.
/* global VERSION, PRECACHE */

const STATIC = `static-${VERSION}`
const RUNTIME = "runtime"
// Ответов API в кэше не больше стольких: у части запросов время в адресе, и они копились бы бесконечно
const RUNTIME_LIMIT = 80
// Страница — из сети; не ответила за столько мс (или сети нет) — из кэша
const NAVIGATE_TIMEOUT = 3000

self.addEventListener("install", (event) => {
  // Обычный режим кэша: то, что страница уже скачала, берётся из HTTP-кэша, а не качается второй раз
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
  // Тайлы OpenFreeMap и прочее чужое, админка PocketBase — мимо
  if (url.origin !== self.location.origin || url.pathname.startsWith("/_/")) return

  if (url.pathname.startsWith("/api/")) {
    // Только открытые данные: списки коллекций и данные главной, и только без входа — то, что видно по
    // правам пользователя (свои обращения, очередь модерации), в общий кэш не попадает
    const open = url.pathname === "/api/eco/home" || /^\/api\/collections\/[^/]+\/records$/.test(url.pathname)
    if (!open || request.headers.has("Authorization")) return
    event.respondWith(networkFirst(request))
    return
  }
  if (request.mode === "navigate") {
    event.respondWith(navigate(request))
    return
  }
  // Файлы сборки с хэшем в имени не меняются никогда
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request))
    return
  }
  // Слои карты, иконка: сразу из кэша, свежая версия — на следующий раз
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

/** Страница сайта — одна на все адреса (SPA): свежая из сети, а без сети или на очень медленной — из кэша */
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
    // Сеть ещё может ответить и обновить кэш — её ошибку здесь уже никто не ждёт
    fresh.catch(() => {})
    return (await cache.match("/")) ?? fresh
  }
}

/** Данные — всегда из сети; кэш — только когда сеть не ответила (офлайн) */
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
