import { useRef, useState, type PointerEvent, type ReactNode } from "react"

export type MapShape = { id: string; path: string }
export type MapDot = { id: string; x: number; y: number }
export type MapLabel = { x: number; y: number; text: string; color: string }

type Props = {
  width: number
  height: number
  shapes: readonly MapShape[]
  /** Райцентры — точки, для которых модель считает воздух; пусто — не рисуются */
  dots: readonly MapDot[]
  labels: readonly MapLabel[]
  fill: (id: string) => string
  a: string
  b: string
  hovered: string | null
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
  tooltip: (id: string) => ReactNode
  ariaLabel: string
}

const outline = (color: string, width: number) => ({
  fill: "none",
  stroke: color,
  strokeWidth: width,
  strokeLinejoin: "round" as const,
  vectorEffect: "non-scaling-stroke" as const,
  pointerEvents: "none" as const,
})

/**
 * Картограмма районов на SVG: цвет — значение показателя, контуры — два сравниваемых района.
 * Без MapLibre и тайлов: 22 полигона, лёгкий чанк, работает офлайн. Доступная альтернатива — список рядом.
 */
export function DistrictMap({
  width,
  height,
  shapes,
  dots,
  labels,
  fill,
  a,
  b,
  hovered,
  onHover,
  onSelect,
  tooltip,
  ariaLabel,
}: Props) {
  const box = useRef<HTMLDivElement>(null)
  // flip — подсказка у правого края уходит влево от курсора
  const [pointer, setPointer] = useState<{ x: number; y: number; flip: boolean } | null>(null)
  const pathOf = (id: string | null) => shapes.find((s) => s.id === id)?.path

  const track = (e: PointerEvent<SVGPathElement>, id: string) => {
    const rect = box.current?.getBoundingClientRect()
    if (rect) {
      const x = e.clientX - rect.left
      setPointer({ x, y: e.clientY - rect.top, flip: x > rect.width * 0.55 })
    }
    onHover(id)
  }

  return (
    <div ref={box} className="relative" onPointerLeave={() => onHover(null)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
        className="block h-auto w-full"
      >
        {shapes.map((s) => (
          <path
            key={s.id}
            d={s.path}
            fillRule="evenodd"
            style={{ fill: fill(s.id) }}
            stroke="var(--background)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            className="cursor-pointer"
            onPointerMove={(e) => track(e, s.id)}
            onPointerDown={(e) => track(e, s.id)}
            onClick={() => onSelect(s.id)}
          />
        ))}
        {/* Контуры поверх заливки: под цветной линией — светлая подложка, чтобы контур читался на любом цвете */}
        {[
          { id: hovered, color: "var(--foreground)", w: 1.5 },
          { id: a, color: "var(--compare-a)", w: 2.5 },
          { id: b, color: "var(--compare-b)", w: 2.5 },
        ].map(({ id, color, w }, i) => {
          const d = pathOf(id)
          if (!d) return null
          return (
            <g key={i}>
              <path d={d} fillRule="evenodd" {...outline("var(--background)", w + 3)} />
              <path d={d} fillRule="evenodd" {...outline(color, w)} />
            </g>
          )
        })}
        {dots.map((d) => (
          <circle
            key={d.id}
            cx={d.x}
            cy={d.y}
            r={4}
            fill="var(--background)"
            stroke="var(--foreground)"
            strokeWidth={1.25}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        ))}
        {labels.map((l) => (
          <text
            key={l.text}
            x={l.x}
            y={l.y}
            textAnchor="middle"
            className="font-heading text-[26px] font-semibold"
            fill={l.color}
            stroke="var(--background)"
            strokeWidth={6}
            paintOrder="stroke"
            strokeLinejoin="round"
            pointerEvents="none"
          >
            {l.text}
          </text>
        ))}
      </svg>

      {hovered && pointer && (
        <div
          role="presentation"
          className="pointer-events-none absolute z-10 w-max max-w-[240px] rounded-md border border-border bg-background px-3 py-2 text-[13px] leading-snug shadow-sm"
          style={{
            left: pointer.x,
            top: pointer.y,
            transform: `translate(${pointer.flip ? "calc(-100% - 12px)" : "12px"}, 12px)`,
          }}
        >
          {tooltip(hovered)}
        </div>
      )}
    </div>
  )
}
