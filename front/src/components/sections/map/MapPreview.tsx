import { useLayoutEffect, useMemo, useRef, useState } from "react"
import type { OblastFeature } from "@/api/geo"
import type { DistrictWithGeometry } from "@/api/reference"
import type { MapTown } from "@/components/map/types"
import { map as text } from "@/content/map"
import { aqiCategory } from "@/lib/aqi"
import { geometryPath, type Projection } from "@/lib/geo"

type Props = {
  districts: readonly DistrictWithGeometry[]
  oblast?: OblastFeature
  towns: readonly MapTown[]
  selectedId: string | null
  padding: { top: number; right: number; bottom: number; left: number }
}

// Same frame and projection (Mercator) as MapLibre: fits text.bounds into the panel minus paddings, so the
// preview matches the real map. Keep in sync with MapView (paddings, MIN_ZOOM, maxBounds).
const mercator = (lat: number) => (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI
const [WEST, SOUTH, EAST, NORTH] = text.bounds
const SCALE = 1000 / (EAST - WEST)
const projection: Projection = {
  width: 1000,
  height: (mercator(NORTH) - mercator(SOUTH)) * SCALE,
  project: (lon, lat) => [(lon - WEST) * SCALE, (mercator(NORTH) - mercator(lat)) * SCALE],
}

const MIN_ZOOM = 5.3
const MIN_SCALE = (512 * 2 ** MIN_ZOOM) / 360 / SCALE
const [MAX_WEST, MAX_SOUTH, MAX_EAST, MAX_NORTH] = text.maxBounds
const [MAX_X0, MAX_Y0] = projection.project(MAX_WEST, MAX_NORTH)
const [MAX_X1, MAX_Y1] = projection.project(MAX_EAST, MAX_SOUTH)
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export function MapPreview({ districts, oblast, towns, selectedId, padding }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const shapes = useMemo(
    () => ({
      districts: districts.flatMap((d) =>
        d.geometry ? [{ id: d.id, d: geometryPath(d.geometry, projection, 1.5) }] : [],
      ),
      outline: oblast ? geometryPath(oblast.geometry, projection, 1.5) : "",
    }),
    [districts, oblast],
  )

  const innerW = size ? size.w - padding.left - padding.right : 0
  const innerH = size ? size.h - padding.top - padding.bottom : 0
  const width = size?.w ?? 0
  const height = size?.h ?? 0
  const scale = Math.max(
    Math.min(innerW / projection.width, innerH / projection.height),
    MIN_SCALE,
    width / (MAX_X1 - MAX_X0),
    height / (MAX_Y1 - MAX_Y0),
  )
  const dx = clamp(
    padding.left + (innerW - projection.width * scale) / 2,
    width - MAX_X1 * scale,
    -MAX_X0 * scale,
  )
  const dy = clamp(
    padding.top + (innerH - projection.height * scale) / 2,
    height - MAX_Y1 * scale,
    -MAX_Y0 * scale,
  )

  return (
    <div ref={box} className="absolute inset-0">
      {size && width > 0 && (
        <svg aria-hidden="true" className="block size-full">
          <g transform={`translate(${dx} ${dy}) scale(${scale})`}>
            {shapes.districts.map((s) => (
              <path
                key={s.id}
                d={s.d}
                fillRule="evenodd"
                fill="var(--map-land)"
                stroke="var(--map-district)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {shapes.outline && (
              <path
                d={shapes.outline}
                fill="none"
                stroke="var(--map-outline)"
                strokeWidth={1.5}
                strokeDasharray="5 4"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </g>
          {[...towns.filter((t) => t.id !== selectedId), ...towns.filter((t) => t.id === selectedId)].map(
            (t) => {
              const [px, py] = projection.project(t.lon, t.lat)
              const x = dx + px * scale
              const y = dy + py * scale
              const selected = t.id === selectedId
              return (
                <g key={t.id}>
                  <circle
                    cx={x}
                    cy={y}
                    r={selected ? 6 : 4.5}
                    fill={aqiCategory(t.aqi)?.color ?? "var(--map-place)"}
                    stroke="var(--map-bg)"
                    strokeWidth={1.5}
                  />
                  {selected && (
                    <text
                      x={x > width * 0.7 ? x - 10 : x + 10}
                      textAnchor={x > width * 0.7 ? "end" : "start"}
                      y={y + 4.5}
                      className="font-heading text-sm font-semibold"
                      fill="var(--foreground)"
                      stroke="var(--map-bg)"
                      strokeWidth={4}
                      paintOrder="stroke"
                      strokeLinejoin="round"
                    >
                      {t.name}
                    </text>
                  )}
                </g>
              )
            },
          )}
        </svg>
      )}
    </div>
  )
}
