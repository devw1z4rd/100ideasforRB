import { useState } from "react"
import { water as text } from "@/content/water"
import { chartThresholds, riverStatus, type PostSummary } from "@/lib/rivers"
import { formatNumber } from "@/lib/format"
import { riverColor } from "@/components/map/riverColor"
import { formatDay } from "../air/format"

// Мини-график уровня за 30 дней: зоны «мелко» и «пойма» подкрашены цветом порога, линия — уровень по дням.
// SVG растягивается на ширину карточки (preserveAspectRatio="none"), поэтому точки и подписи — HTML поверх.

const W = 300
const H = 72
const dayMs = (day: string) => Date.parse(`${day}T00:00:00Z`)
const zoneColor = { low: riverColor.low, flood: riverColor.flood, danger: riverColor.danger } as const

export function RiverChart({ summary }: { summary: PostSummary }) {
  const [hover, setHover] = useState<number | null>(null)
  const { series, post } = summary
  const thresholds = chartThresholds(summary)

  const t0 = dayMs(series[0].day)
  const span = Math.max(dayMs(series[series.length - 1].day) - t0, 1)
  const values = [...series.map((l) => l.level), ...thresholds.map((t) => t.value)]
  const pad = Math.max((Math.max(...values) - Math.min(...values)) * 0.15, 4)
  const lo = Math.min(...values) - pad
  const hi = Math.max(...values) + pad
  const x = (day: string) => ((dayMs(day) - t0) / span) * W
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H
  const pct = (v: number, of: number) => `${(v / of) * 100}%`

  const path = series
    .map((l, i) => `${i ? "L" : "M"}${x(l.day).toFixed(1)},${y(l.level).toFixed(1)}`)
    .join("")
  const shown = hover === null ? series[series.length - 1] : series[hover]

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const at = ((e.clientX - rect.left) / rect.width) * W
    let best = 0
    series.forEach((l, i) => {
      if (Math.abs(x(l.day) - at) < Math.abs(x(series[best].day) - at)) best = i
    })
    setHover(best)
  }

  return (
    <div className="mt-4">
      <div
        role="img"
        aria-label={text.levels.chartLabel(post.river, post.name)}
        className="relative h-[72px] touch-pan-y"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
        >
          {thresholds.map((t) => (
            <rect
              key={t.kind}
              x={0}
              width={W}
              y={t.kind === "low" ? y(t.value) : 0}
              height={t.kind === "low" ? H - y(t.value) : y(t.value)}
              fill={zoneColor[t.kind]}
              opacity={0.14}
            />
          ))}
          {thresholds.map((t) => (
            <line
              key={t.kind}
              x1={0}
              x2={W}
              y1={y(t.value)}
              y2={y(t.value)}
              stroke={zoneColor[t.kind]}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path
            d={path}
            fill="none"
            stroke="var(--foreground)"
            strokeWidth={1.5}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {thresholds.map((t) => (
          <span
            key={t.kind}
            className="absolute left-0 -translate-y-full pb-0.5 text-[10px] leading-none text-muted-foreground tabular-nums"
            style={{ top: pct(y(t.value), H) }}
          >
            {text.levels.threshold[t.kind]} {t.value}
          </span>
        ))}
        {hover !== null && (
          <span
            aria-hidden="true"
            className="absolute inset-y-0 w-px bg-foreground/30"
            style={{ left: pct(x(series[hover].day), W) }}
          />
        )}
        <span
          aria-hidden="true"
          className="absolute size-2 -translate-1/2 rounded-full ring-2 ring-background"
          style={{
            left: pct(x(shown.day), W),
            top: pct(y(shown.level), H),
            background: riverColor[riverStatus(shown.level, post)],
          }}
        />
      </div>
      <p className="mt-1.5 flex justify-between text-[11px] text-muted-foreground tabular-nums">
        {hover === null ? (
          <>
            <span>{formatDay(series[0].day)}</span>
            <span>{formatDay(series[series.length - 1].day)}</span>
          </>
        ) : (
          <span className="text-foreground">
            {formatDay(shown.day)} · {formatNumber(shown.level)} {text.levels.unit}
          </span>
        )}
      </p>
    </div>
  )
}
