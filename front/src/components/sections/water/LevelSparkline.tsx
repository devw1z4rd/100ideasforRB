import { useInView } from "motion/react"
import { useRef, useState } from "react"
import { AreaSparkline } from "@/components/charts/sparkline"
import { riverColor } from "@/components/map/riverColor"
import { water } from "@/content/water"
import { formatNumber } from "@/lib/format"
import { levelScale, type LevelZone, type PostSummary, type RiverLevel } from "@/lib/rivers"
import { cn } from "@/lib/utils"
import { formatDay } from "../air/format"

const text = water.levels
const PAD = { top: 6, right: 6, bottom: 0, left: 0 }
const LABEL_ROOM = 14

export function LevelSparkline({
  summary,
  height = 56,
  className,
}: {
  summary: PostSummary
  height?: number
  className?: string
}) {
  const [hover, setHover] = useState<RiverLevel | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const seen = useInView(box, { once: true, amount: 0.6 })
  const { series, post, latest, status } = summary
  const { lo, hi, zones } = levelScale(summary)
  const inner = height - PAD.top - PAD.bottom
  const y = (v: number) => PAD.top + inner - ((v - lo) / (hi - lo)) * inner

  return (
    <div className={className}>
      <div ref={box} className="relative" style={{ height }}>
        {zones.map((z) => (
          <Zone
            key={z.kind}
            zone={z}
            top={z.to >= hi ? 0 : y(z.to)}
            bottom={z.from <= lo ? height : y(z.from)}
          />
        ))}
        {seen && (
          <AreaSparkline
            data={series}
            dataKey="level"
            height={height}
            padding={PAD}
            yDomain={[lo, hi]}
            curve="monotone"
            strokeWidth={1.75}
            fillOpacity={0.4}
            aria-label={text.chartLabel(post.river, post.name)}
            onHoverChange={(_, d) => setHover(d)}
            className="absolute inset-0"
          />
        )}
        {seen && !hover && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute size-2 -translate-1/2 animate-in rounded-full ring-2 ring-background delay-700 duration-300 fill-mode-both zoom-in-50 fade-in"
            style={{
              left: `calc(100% - ${PAD.right}px)`,
              top: y(latest.level),
              background: riverColor[status],
            }}
          />
        )}
      </div>
      <p className="mt-1 flex justify-between text-[11px] text-muted-foreground tabular-nums">
        {hover ? (
          <span className="text-foreground">
            {formatDay(hover.day)} · {formatNumber(hover.level)} {text.unit}
          </span>
        ) : (
          <>
            <span>{formatDay(series[0].day)}</span>
            <span>{formatDay(latest.day)}</span>
          </>
        )}
      </p>
    </div>
  )
}

function Zone({ zone, top, bottom }: { zone: LevelZone; top: number; bottom: number }) {
  const color = riverColor[zone.kind]
  const below = zone.kind === "low"
  const room = bottom - top >= LABEL_ROOM
  const edge = below ? top : bottom
  const labelBelow = below === room
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-x-0"
        style={{
          top,
          height: bottom - top,
          background: `color-mix(in oklab, ${color} 16%, transparent)`,
          [below ? "borderTop" : "borderBottom"]: `1px dashed ${color}`,
        }}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-1 text-[10px] leading-none font-medium text-muted-foreground",
          labelBelow ? "translate-y-[3px]" : "-translate-y-[calc(100%+3px)]",
        )}
        style={{ top: edge }}
      >
        {text.zone[zone.kind]}
      </span>
    </>
  )
}
