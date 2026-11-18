import { Link } from "react-router"
import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/button"
import { notFound as text } from "@/content/notFound"
import { useDocumentTitle } from "@/lib/useDocumentTitle"

/**
 * 404: «4 0 4», где ноль — спил дерева с годичными кольцами и трещиной. Дерево «растёт»: кольца по очереди
 * от сердцевины к коре расширяются из центра и проявляются, потом проступает трещина (CSS `ring-grow`
 * в index.css, при prefers-reduced-motion — сразу целиком).
 */
export function NotFoundPage() {
  useDocumentTitle(text.title)

  return (
    <Container
      className="flex flex-col items-center justify-center py-16 text-center"
      style={{ minHeight: "calc(100svh - var(--header-h))" }}
    >
      <p className="text-[13px] font-medium text-muted-foreground">{text.eyebrow}</p>

      <p
        aria-hidden="true"
        className="mt-4 flex items-center font-heading text-[clamp(112px,20vw,260px)] leading-none font-semibold tracking-[-0.06em] select-none"
      >
        <span>4</span>
        <TreeRings className="mx-[0.04em] h-[0.74em] w-[0.74em]" />
        <span>4</span>
      </p>

      <h1 className="mt-8 font-heading text-[clamp(28px,3.4vw,44px)] leading-[1.1] font-semibold tracking-[-0.03em]">
        {text.title}
      </h1>

      <Button asChild size="lg" className="mt-8">
        <Link to="/">{text.home}</Link>
      </Button>
    </Container>
  )
}

// Кольца спила: ширина колец неровная, как у настоящего дерева; внешние — чуть кривее. Всё детерминировано
const SIZE = 200
const CENTER = { x: 104, y: 98 }
const rings = (() => {
  let seed = 404
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  const widths = Array.from({ length: 13 }, () => 0.55 + rnd() * 0.9)
  const total = widths.reduce((a, b) => a + b, 0)
  let r = 6
  return widths.map((w, k) => {
    r += (w / total) * 86
    const amp = 0.012 + (k / widths.length) * 0.03
    const p1 = rnd() * Math.PI * 2
    const p2 = rnd() * Math.PI * 2
    const points = Array.from({ length: 96 }, (_, i) => {
      const a = (i / 96) * Math.PI * 2
      const rr = r * (1 + amp * Math.sin(3 * a + p1) + amp * 0.6 * Math.sin(5 * a + p2))
      return `${(CENTER.x + rr * Math.cos(a)).toFixed(1)},${(CENTER.y + rr * Math.sin(a)).toFixed(1)}`
    })
    return `M${points.join("L")}Z`
  })
})()

// Кольца растут из сердцевины: центр масштабирования — в координатах viewBox
const grow = { transformBox: "view-box", transformOrigin: `${CENTER.x}px ${CENTER.y}px` } as const

function TreeRings({ className }: { className?: string }) {
  const last = rings.length - 1
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={className} fill="none" stroke="currentColor">
      {rings.map((d, i) => (
        <path
          key={i}
          d={d}
          // Кора — толще, внутренние кольца — тонкие; растут от сердцевины наружу
          strokeWidth={i === last ? 7 : i % 4 === 3 ? 2.2 : 1.3}
          strokeLinejoin="round"
          className="ring-grow"
          style={{ ...grow, animationDelay: `${120 + i * 75}ms` }}
        />
      ))}
      {/* Сердцевина и трещина от неё к коре */}
      <circle
        cx={CENTER.x}
        cy={CENTER.y}
        r={3.5}
        fill="currentColor"
        stroke="none"
        className="ring-grow"
        style={grow}
      />
      <path
        d={`M${CENTER.x + 8},${CENTER.y - 6} L${CENTER.x + 22},${CENTER.y - 20} L${CENTER.x + 28},${CENTER.y - 24} L${CENTER.x + 44},${CENTER.y - 44} L${CENTER.x + 52},${CENTER.y - 50} L${CENTER.x + 62},${CENTER.y - 64}`}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="ring-crack"
        style={{ animationDelay: `${200 + rings.length * 75}ms` }}
      />
    </svg>
  )
}
