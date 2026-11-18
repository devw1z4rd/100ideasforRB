import { useId } from "react"
import { useOblast, useRivers, type GeoCollection, type LineFeature } from "@/api/geo"
import { PageTip } from "./static"
import { water as text } from "@/content/water"
import { fitProjection, geometryPath, type PolygonGeometry, type Projection } from "@/lib/geo"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Section } from "@/lib/water"

const WIDTH = 400

type Art = {
  projection: Projection
  outline: string
  rivers: Array<{ key: string; major: boolean; d: string }>
}
const artCache = new WeakMap<object, WeakMap<object, Art>>()

function buildArt(geometry: PolygonGeometry, rivers: GeoCollection<LineFeature>): Art {
  const projection = fitProjection([geometry], WIDTH)
  return {
    projection,
    outline: geometryPath(geometry, projection, 1.2),
    rivers: rivers.features.map((f, k) => ({
      key: `${f.properties.name}-${k}`,
      major: f.properties.major,
      d: f.geometry.coordinates
        .map((line) =>
          line
            .map(([lon, lat], i) => {
              const [x, y] = projection.project(lon, lat)
              return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`
            })
            .join(""),
        )
        .join(""),
    })),
  }
}

function getArt(geometry: PolygonGeometry, rivers: GeoCollection<LineFeature>): Art {
  let byRivers = artCache.get(geometry)
  if (!byRivers) artCache.set(geometry, (byRivers = new WeakMap()))
  let art = byRivers.get(rivers)
  if (!art) byRivers.set(rivers, (art = buildArt(geometry, rivers)))
  return art
}

export function RiversArt({
  sections,
  tone,
  interactive = false,
  className,
}: {
  sections: readonly Section[]
  tone: "cover" | "paper"
  interactive?: boolean
  className?: string
}) {
  const oblast = useOblast()
  const rivers = useRivers()
  const clipId = useId()
  const geometry = oblast.data?.features[0]?.geometry as PolygonGeometry | undefined

  const art = geometry && rivers.data ? getArt(geometry, rivers.data) : null
  if (!art) return <div className={className} />
  const { projection, outline, rivers: riverPaths } = art

  const cover = tone === "cover"
  const dotColor = (worst: number) =>
    worst > 1.5 ? "var(--level-high)" : worst > 1 ? "var(--level-elevated)" : undefined

  return (
    <svg
      viewBox={`-6 -6 ${projection.width + 12} ${projection.height + 12}`}
      className={className}
      aria-hidden={!interactive || undefined}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={outline} />
        </clipPath>
      </defs>
      <path
        d={outline}
        fillRule="evenodd"
        fill={cover ? "color-mix(in oklab, var(--book-cover-ink) 6%, transparent)" : "var(--muted)"}
        stroke={cover ? "color-mix(in oklab, var(--book-cover-ink) 55%, transparent)" : "var(--foreground)"}
        strokeOpacity={cover ? 1 : 0.35}
        strokeWidth={1}
        strokeDasharray={cover ? "3 3" : undefined}
      />
      <g clipPath={`url(#${clipId})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {riverPaths.map((r) => (
          <path
            key={r.key}
            d={r.d}
            stroke={cover ? "var(--book-river)" : "var(--map-river)"}
            strokeWidth={r.major ? 2.2 : 1}
            strokeOpacity={r.major ? 1 : 0.7}
          />
        ))}
      </g>
      {sections.map((s) => {
        const [x, y] = projection.project(s.location.lon, s.location.lat)
        const color = dotColor(s.worst)
        const dot = (
          <circle
            cx={x}
            cy={y}
            r={color ? 6 : 3.5}
            fill={color ?? (cover ? "var(--book-cover-muted)" : "var(--muted-foreground)")}
            stroke={cover ? "var(--book-cover)" : "var(--book-paper)"}
            strokeWidth={2}
            className={cn(interactive && "cursor-default outline-none")}
            tabIndex={interactive ? 0 : undefined}
          />
        )
        return interactive ? (
          <PageTip
            key={s.name}
            side="top"
            content={
              s.worst > 1
                ? `${s.name} — до ${formatNumber(s.worst, 1)}× хуже норматива`
                : `${s.name} — ${text.report.summary.mapLegend.none}`
            }
          >
            {dot}
          </PageTip>
        ) : (
          <g key={s.name}>{dot}</g>
        )
      })}
    </svg>
  )
}
