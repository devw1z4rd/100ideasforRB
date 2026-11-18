/**
 * Регистрация service worker (sw/sw.js, CLAUDE.md §6 «Загрузка главной») — только в сборке. При установке он
 * скачивает весь код сайта (~1 МБ), поэтому регистрируется не сразу: после загрузки страницы, после `after`
 * (на главной — код карты) и ещё паузы — чтобы не отбирать канал у первого экрана. При экономии трафика
 * (Save-Data) не регистрируется вовсе.
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
