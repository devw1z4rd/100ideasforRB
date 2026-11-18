const KEY = "eco-stale-chunk-reload"
const MIN_INTERVAL_MS = 60_000

/** `last` is the time of the previous reload (NaN if none or unreadable). */
export function shouldReload(last: number, now: number) {
  return !Number.isFinite(last) || now - last >= MIN_INTERVAL_MS
}

/**
 * After a deploy, a tab opened on the previous build still asks for its old chunks, which are gone (Caddy
 * answers 404). Reload once to pick up the new build. At most once a minute: if the new build fails as well
 * (broken deploy, offline with the chunk not cached), the error shows instead of a reload loop.
 *
 * `pendingHref` gives the target of a navigation in progress: a route's chunk loads before the URL changes,
 * so a plain reload would land on the page the user was leaving.
 */
export function reloadOnStaleChunk(pendingHref: () => string | null) {
  window.addEventListener("vite:preloadError", (event) => {
    try {
      const now = Date.now()
      if (!shouldReload(Number(sessionStorage.getItem(KEY) ?? NaN), now)) return
      sessionStorage.setItem(KEY, String(now))
    } catch {
      // Without storage there is no loop guard, so don't reload.
      return
    }
    event.preventDefault()
    const href = pendingHref()
    if (href) location.assign(href)
    else location.reload()
  })
}
