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
  /** Те же отступы под панели, что у настоящей карты: область встаёт на то же место */
  padding: { top: number; right: number; bottom: number; left: number }
}

// Та же рамка и та же проекция (Меркатор), что у MapLibre: карта вписывает text.bounds в панель за вычетом
// отступов, заглушка — туда же, поэтому контуры заглушки и настоящей карты совпадают
const mercator = (lat: number) => (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI
const [WEST, SOUTH, EAST, NORTH] = text.bounds
const SCALE = 1000 / (EAST - WEST)
const projection: Projection = {
  width: 1000,
  height: (mercator(NORTH) - mercator(SOUTH)) * SCALE,
  project: (lon, lat) => [(lon - WEST) * SCALE, (mercator(NORTH) - mercator(lat)) * SCALE],
}

// Ограничения настоящей карты (MapView): она не отдаляется дальше MIN_ZOOM и не показывает ничего за maxBounds —
// на узком высоком экране телефона из-за этого область крупнее, чем «вписанная». Заглушка повторяет то же
const MIN_ZOOM = 5.3
const MIN_SCALE = (512 * 2 ** MIN_ZOOM) / 360 / SCALE
const [MAX_WEST, MAX_SOUTH, MAX_EAST, MAX_NORTH] = text.maxBounds
const [MAX_X0, MAX_Y0] = projection.project(MAX_WEST, MAX_NORTH)
const [MAX_X1, MAX_Y1] = projection.project(MAX_EAST, MAX_SOUTH)
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/**
 * Карта-заглушка на SVG, пока качается MapLibre (CLAUDE.md §6 «Загрузка главной»): районы, контур области и
 * города цветом AQI — из уже загруженных данных, без тайлов и WebGL. На медленной сети область с городами видна
 * на секунды (на 3G — на десятки секунд) раньше настоящей карты; та потом проявляется поверх на том же месте
 * и в том же масштабе. Картинка без действий: города выбираются в панели рядом.
 */
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

  // Рамка вписывается в панель за вычетом отступов и встаёт по центру — как fitBounds у MapLibre.
  // Города и подпись рисуются в пикселях экрана: на телефоне рамка втрое меньше, а точки должны остаться видны
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
          {/* Выбранный город — последним: его точка и подпись ложатся поверх соседних */}
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
                      // У правого края подпись встаёт слева от точки — иначе обрежется
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
