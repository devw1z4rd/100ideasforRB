import { useLayoutEffect, useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { StaticPage } from "./static"

// Leaf strips: the bend grows towards the free edge as c^EXP, so strips are cut to take equal shares of the
// bend (wide at the spine, narrow at the edge). The angle between neighbors stays small and even — the page
// curves without kinks.
const STRIPS = 24
const EXP = 1.6
const BOUNDS = Array.from({ length: STRIPS + 1 }, (_, k) => (k / STRIPS) ** (1 / EXP))
const STARTS = BOUNDS.slice(0, -1)
const WIDTHS = BOUNDS.slice(1).map((b, k) => b - BOUNDS[k])
const DURATION = 720
const OVERLAP = 2
const LEAD = 55

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
// Bend over time peaks at a third of the turn and fades to ~0, so the page lands softly instead of sliding in
// an arc. 6.75 = 1 / max(t·(1−t)²).
const curl = (t: number) => 6.75 * t * (1 - t) ** 2

/**
 * Ids in the copy are made unique, otherwise url(#id) in SVG points at the hidden original and doesn't
 * render.
 */
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

export function Leaf({
  dir,
  width,
  front,
  back,
  onDone,
}: {
  dir: "next" | "prev"
  width: number
  front: ReactNode
  back: ReactNode
  onDone: () => void
}) {
  const root = useRef<HTMLDivElement>(null)
  const frontSrc = useRef<HTMLDivElement>(null)
  const backSrc = useRef<HTMLDivElement>(null)
  const done = useRef(onDone)
  done.current = onDone

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
      const base = dir === "next" ? -180 * p : -180 * (1 - p)
      const lead = curl(t) * LEAD * (dir === "next" ? -1 : 1)
      // Strips as a flat list: each starts where the previous one ended, with its own angle. Drawn in order
      // without 3D sorting — sorting clipped intersections and left light gaps.
      let x = 0
      let z = 0
      strips.forEach((strip, k) => {
        const a = Math.min(0, Math.max(-180, base + (lead * (k + 0.5)) / STRIPS))
        strip.style.transform = `translate3d(${x}px, 0, ${z}px) rotateY(${a}deg)`
        const rad = (a * Math.PI) / 180
        x += WIDTHS[k] * width * Math.cos(rad)
        z -= WIDTHS[k] * width * Math.sin(rad)
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
  // Each strip overlaps the next by OVERLAP px (the next one is drawn on top), so antialiased edges leave no
  // gaps.
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
        className="book-static pointer-events-none absolute inset-0 z-20 [perspective-origin:0%_50%] [perspective:2600px]"
      >
        {WIDTHS.map((_, k) => strip(k))}
      </div>
    </StaticPage.Provider>
  )
}
