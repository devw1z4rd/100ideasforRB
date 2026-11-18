/**
 * Production builds only. Install downloads the whole site (~1 MB), so registration waits for page load,
 * `after` (the map code on the home page) and a pause; skipped with Save-Data.
 */
export function registerServiceWorker(after?: Promise<unknown>) {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  if (connection?.saveData) return

  const register = () => {
    window.setTimeout(() => void navigator.serviceWorker.register("/sw.js").catch(() => {}), 4000)
  }
  const loaded = new Promise<void>((resolve) => {
    if (document.readyState === "complete") resolve()
    else window.addEventListener("load", () => resolve(), { once: true })
  })
  void Promise.all([loaded, after?.catch(() => {})]).then(register)
}
