import { useLayoutEffect, useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { StaticPage } from "./static"

// Полоски листа. Изгиб растёт к свободному краю как c^EXP, поэтому полоски нарезаны так, чтобы каждая
// забирала равную долю изгиба: у корешка широкие, к краю узкие. Тогда угол между соседними полосками везде
// одинаковый и маленький (≈ LEAD / STRIPS) — лист гнётся дугой, без заломов
const STRIPS = 24
const EXP = 1.6
const BOUNDS = Array.from({ length: STRIPS + 1 }, (_, k) => (k / STRIPS) ** (1 / EXP))
const STARTS = BOUNDS.slice(0, -1)
const WIDTHS = BOUNDS.slice(1).map((b, k) => b - BOUNDS[k])
// Оборот листа, мс
const DURATION = 720
// Насколько полоска заходит под следующую, px
const OVERLAP = 2
// Насколько свободный край обгоняет корешок, градусов (в пике — на первой трети оборота)
const LEAD = 55

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
// Изгиб по времени: сильный, пока лист поднимают (пик на трети оборота), к концу почти ноль — лист ложится
// мягко, а не скользит по странице дугой. 6,75 = 1 / max(t·(1−t)²)
const curl = (t: number) => 6.75 * t * (1 - t) ** 2

/** id в копии делаются уникальными: иначе url(#id) в SVG ссылался бы на скрытый оригинал и не рисовался */
function uniquifyIds(root: Element, suffix: string) {
  const els = root.querySelectorAll("[id]")
  if (!els.length) return
  const map = new Map<string, string>()
  els.forEach((el) => {
    map.set(el.id, el.id + suffix)
    el.id += suffix
  })
  root.querySelectorAll("svg *").forEach((el) => {
    for (const attr of ["fill", "stroke", "clip-path", "mask", "filter"]) {
      const v = el.getAttribute(attr)
      if (!v?.startsWith("url(#")) continue
      const next = map.get(v.slice(5, -1))
      if (next) el.setAttribute(attr, `url(#${next})`)
    }
  })
}

/**
 * Перелистывание как в книге: на листе напечатаны страницы. Вперёд: лицо — правая страница, с которой уходим,
 * изнанка — левая страница, на которую приходим; под листом уже лежит новая правая. Назад — наоборот.
 * Лист ложится ровно поверх такой же страницы — после него ничего не меняется.
 * Страницы React рисует один раз (скрытые оригиналы), полоски получают их DOM-копии: копий много, а React-рендер
 * каждой был бы долгим. Изгиб: полоска k повёрнута на абсолютный угол = угол листа + изгиб × доля к краю,
 * её левый край — там, где кончилась предыдущая.
 * Тень — отдельным слоем с прозрачностью по углу полоски: кадр меняет только transform и opacity, без перерисовки.
 * width — ширина страницы, px. При prefers-reduced-motion листа нет.
 */
export function Leaf({
  dir,
  width,
  front,
  back,
  onDone,
}: {
  dir: "next" | "prev"
  width: number
  /** Лицо листа — правая страница */
  front: ReactNode
  /** Изнанка — левая страница */
  back: ReactNode
  onDone: () => void
}) {
  const root = useRef<HTMLDivElement>(null)
  const frontSrc = useRef<HTMLDivElement>(null)
  const backSrc = useRef<HTMLDivElement>(null)
  const done = useRef(onDone)
  done.current = onDone

  // До отрисовки: копии страниц на полосках и первый кадр листа уже в начальном положении
  useLayoutEffect(() => {
    const el = root.current
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      done.current()
      return
    }
    const frontPage = frontSrc.current?.firstElementChild
    const backPage = backSrc.current?.firstElementChild
    const holders = [...el.querySelectorAll<HTMLElement>("[data-print]")]
    holders.forEach((h, i) => {
      const page = h.dataset.print === "front" ? frontPage : backPage
      if (!page) return
      const copy = page.cloneNode(true) as Element
      uniquifyIds(copy, `-leaf${i}`)
      h.replaceChildren(copy)
    })

    const strips = [...el.querySelectorAll<HTMLElement>("[data-strip]")]
    const shades = [...el.querySelectorAll<HTMLElement>("[data-shade]")]
    const start = performance.now()
    let raf = 0

    const frame = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / DURATION))
      const p = easeInOut(t)
      // Угол листа у корешка: вперёд 0 → −180°, назад −180° → 0
      const base = dir === "next" ? -180 * p : -180 * (1 - p)
      const lead = curl(t) * LEAD * (dir === "next" ? -1 : 1)
      // Полоски — плоским списком: левый край k-й там, где кончилась предыдущая (x, z от корешка), поворот —
      // свой угол. Рисуются по порядку, без 3D-сортировки: она резала пересечения и оставляла светлые щели
      let x = 0
      let z = 0
      strips.forEach((strip, k) => {
        // Доля изгиба: полоски нарезаны так, что у k-й она (k + ½) / STRIPS
        const a = Math.min(0, Math.max(-180, base + (lead * (k + 0.5)) / STRIPS))
        strip.style.transform = `translate3d(${x}px, 0, ${z}px) rotateY(${a}deg)`
        const rad = (a * Math.PI) / 180
        x += WIDTHS[k] * width * Math.cos(rad)
        z -= WIDTHS[k] * width * Math.sin(rad)
        // Ребром к зрителю — темнее, плашмя — без тени: лёгший лист не отличается от страницы под ним
        const shade = String(0.3 * Math.abs(Math.sin((a * Math.PI) / 180)))
        shades[2 * k].style.opacity = shade
        shades[2 * k + 1].style.opacity = shade
      })
      if (t < 1) raf = requestAnimationFrame(frame)
      else done.current()
    }
    frame(start)
    return () => {
      cancelAnimationFrame(raf)
      holders.forEach((h) => h.replaceChildren())
    }
  }, [dir, width])

  const last = STRIPS - 1
  // Полоска на OVERLAP px заходит под следующую (та рисуется позже и накрывает её) — сглаженные края соседних
  // полосок не оставляют щелей. Копия страницы сдвинута так, чтобы в полоске была её часть; изнанка зеркальна —
  // считается от другого края
  const strip = (k: number): ReactNode => {
    const w = WIDTHS[k] * width + (k < last ? OVERLAP : 0)
    return (
      <div
        key={k}
        data-strip
        className="absolute inset-y-0 left-0 origin-left [transform-style:preserve-3d]"
        style={{ width: w }}
      >
        <div
          className={cn(
            "absolute inset-0 overflow-hidden [backface-visibility:hidden]",
            k === last && "rounded-r-xl",
          )}
        >
          <div
            data-print="front"
            className="absolute inset-y-0"
            style={{ left: -STARTS[k] * width, width }}
          />
          <div data-shade className="absolute inset-0 bg-black opacity-0 will-change-[opacity]" />
        </div>
        <div
          className={cn(
            "absolute inset-0 [transform:rotateY(180deg)] overflow-hidden [backface-visibility:hidden]",
            k === last && "rounded-l-xl",
          )}
        >
          <div
            data-print="back"
            className="absolute inset-y-0"
            style={{ left: -(width - STARTS[k] * width - w), width }}
          />
          <div data-shade className="absolute inset-0 bg-black opacity-0 will-change-[opacity]" />
        </div>
      </div>
    )
  }

  return (
    <StaticPage.Provider value={true}>
      {/* Оригиналы страниц: React рисует их один раз, на полоски идут копии */}
      <div hidden>
        <div ref={frontSrc} className="h-full" style={{ width }}>
          {front}
        </div>
        <div ref={backSrc} className="h-full" style={{ width }}>
          {back}
        </div>
      </div>
      <div
        ref={root}
        aria-hidden="true"
        inert
        // Перспектива — у самого листа, с центром на корешке: полоски получают её по отдельности
        className="book-static pointer-events-none absolute inset-0 z-20 [perspective-origin:0%_50%] [perspective:2600px]"
      >
        {WIDTHS.map((_, k) => strip(k))}
      </div>
    </StaticPage.Provider>
  )
}
