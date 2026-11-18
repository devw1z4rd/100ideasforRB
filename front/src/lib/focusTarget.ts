// Переход к конкретному элементу ниже по странице — например, с карты к карточке поста в разделе «Вода»
// (CLAUDE.md §10.4): прокрутить так, чтобы элемент оказался по центру экрана, и коротко подсветить, чтобы
// взгляд сразу его нашёл. Просто прокрутка к большому разделу теряла то, что человек смотрел на карте.

const FLASH_MS = 2600
/** Сколько ждать, пока элемент появится (раздел ещё грузит данные), мс */
const WAIT_MS = 5000

/** id карточки поста уровня воды в разделе «Вода» */
export const riverPostAnchor = (code: number) => `river-post-${code}`

/** id самой свежей книжки на полке квартальных обзоров */
export const latestReportAnchor = "water-report-latest"

/**
 * Прокрутить к элементу с id и подсветить его (атрибут data-flash, анимация — в index.css). Если элемента ещё
 * нет — сначала к запасному (разделу), затем, когда элемент появится, — к нему.
 */
export function focusTarget(id: string, fallbackId?: string) {
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const behavior: ScrollBehavior = smooth ? "smooth" : "auto"
  const start = performance.now()
  let fellBack = false

  const tick = () => {
    const el = document.getElementById(id)
    if (el) {
      // inline: на телефоне карточки — в карусели, она тоже докручивается до нужной
      el.scrollIntoView({ behavior, block: "center", inline: "center" })
      el.removeAttribute("data-flash")
      // Перезапуск анимации, если подсвечиваем тот же элемент повторно
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
