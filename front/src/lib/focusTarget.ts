const FLASH_MS = 2600
const WAIT_MS = 5000

export const riverPostAnchor = (code: number) => `river-post-${code}`

export const latestReportAnchor = "water-report-latest"

export function focusTarget(id: string, fallbackId?: string) {
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const behavior: ScrollBehavior = smooth ? "smooth" : "auto"
  const start = performance.now()
  let fellBack = false

  const tick = () => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior, block: "center", inline: "center" })
      el.removeAttribute("data-flash")
      void el.offsetWidth
      el.setAttribute("data-flash", "")
      window.setTimeout(() => el.removeAttribute("data-flash"), FLASH_MS)
      return
    }
    if (!fellBack && fallbackId) {
      document.getElementById(fallbackId)?.scrollIntoView({ behavior, block: "start" })
      fellBack = true
    }
    if (performance.now() - start < WAIT_MS) requestAnimationFrame(tick)
  }
  tick()
}
