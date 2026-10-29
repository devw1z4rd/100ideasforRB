import "maplibre-gl/dist/maplibre-gl.css"
import { setWorkerUrl } from "maplibre-gl"
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url"
import { Droplets, Minus, Plus } from "lucide-react"
import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from "react"
import MapGL, {
  Layer,
  Marker,
  Popup,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
  type StyleSpecification,
} from "react-map-gl/maplibre"
import type { GeoCollection, LineFeature, OblastFeature } from "@/api/geo"
import type { DistrictWithGeometry } from "@/api/reference"
import { map as text } from "@/content/map"
import { categoryLabels, statusLabels } from "@/content/reports"
import { indicators, months } from "@/content/water"
import { formatNumber } from "@/lib/format"
import type { Section as WaterSection } from "@/lib/water"
import { aqiCategory } from "@/lib/aqi"
import { scaleBar, snapToLines } from "@/lib/mapGeo"
import { cn } from "@/lib/utils"
import { ReportIcon } from "./ReportIcon"
import type { MapPlace, MapReport, MapTown } from "./types"

export type MapLayersShown = {
  air: boolean
  reports: boolean
  rivers: boolean
  labels: boolean
  districts: boolean
}

type Props = {
  towns: readonly MapTown[]
  selectedId: string | null
  onSelectTown: (id: string) => void
  districts: readonly DistrictWithGeometry[]
  /** Район → город с точкой воздуха (у Гомельского района — сам Гомель) */
  districtTown: ReadonlyMap<string, string>
  oblast: GeoCollection<OblastFeature> | undefined
  rivers: GeoCollection<LineFeature> | undefined
  reports: readonly MapReport[]
  places: readonly MapPlace[]
  /** Участки рек из последнего обзора Белгидромета (§10.8) */
  waterSections: readonly WaterSection[]
  /** «II квартал 2026» — подпись источника во всплывашке */
  waterQuarter: string
  shown: MapLayersShown
  /** Отступы при «Вся область»: на десктопе слева и справа лежат панели */
  padding: { top: number; right: number; bottom: number; left: number }
  /** Команды карте снаружи: «Приблизить» в карточке города */
  apiRef?: Ref<MapApi>
}

export type MapApi = { zoomTo: (at: { lon: number; lat: number }) => void }

// Цвета карты — токены tokens.css (MapLibre не понимает var(), читаем значения)
function readColors() {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string) => css.getPropertyValue(name).trim()
  return {
    bg: v("--map-bg"),
    land: v("--map-land"),
    outline: v("--map-outline"),
    district: v("--map-district"),
    river: v("--map-river"),
  }
}

// MapLibre 6 ищет воркер рядом со своим модулем (import.meta.url), а после сборки Vite его там нет —
// отдаём воркер отдельным ассетом и говорим, где он
setWorkerUrl(workerUrl)

const TOWN_ZOOM = 8.5
const DISTRICTS_FROM_ZOOM = 8

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** Карта области: свой минимальный стиль из GeoJSON, без тайлов и шрифтов с чужих серверов — работает офлайн. */
export default function MapView({
  towns,
  selectedId,
  onSelectTown,
  districts,
  districtTown,
  oblast,
  rivers,
  reports,
  places,
  waterSections,
  waterQuarter,
  shown,
  padding,
  apiRef,
}: Props) {
  const mapRef = useRef<MapRef>(null)
  const colors = useMemo(() => readColors(), [])
  const [view, setView] = useState({ zoom: 7, lat: 52.3 })
  const [hoverDistrict, setHoverDistrict] = useState<string | null>(null)
  const [openReport, setOpenReport] = useState<MapReport | null>(null)
  const [openPlace, setOpenPlace] = useState<MapPlace | null>(null)
  const [openWater, setOpenWater] = useState<WaterSection | null>(null)

  const style = useMemo<StyleSpecification>(
    () => ({
      version: 8,
      sources: {},
      layers: [{ id: "bg", type: "background", paint: { "background-color": colors.bg } }],
    }),
    [colors.bg],
  )

  const districtData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: districts
        .filter((d) => d.geometry)
        .map((d) => ({
          type: "Feature" as const,
          properties: { id: d.id, name: d.name },
          geometry: d.geometry!,
        })),
    }),
    [districts],
  )

  const riverLabels = useMemo(() => {
    if (!rivers) return []
    return text.riverLabels.flatMap((hint) => {
      const river = rivers.features.find((f) => f.properties.name === hint.name)
      const at = river && snapToLines(river.geometry.coordinates, hint.lon, hint.lat)
      return at ? [{ name: hint.name, side: hint.side, ...at }] : []
    })
  }, [rivers])

  const fitOblast = () =>
    mapRef.current?.fitBounds(text.bounds, { padding, duration: reducedMotion() ? 0 : 600 })

  // Отступы зависят от ширины (панели на десктопе) — при их смене заново вписываем область
  useEffect(() => {
    mapRef.current?.fitBounds(text.bounds, { padding, duration: 0 })
  }, [padding])

  // Сменился город (стрелки в карточке, клик по району, выбор в разделе «Воздух»): если карта приближена или город
  // вне видимой части — плавно ведём к нему, сохраняя масштаб. На обзоре всей области все города и так видны.
  const centeredId = useRef(selectedId)
  useEffect(() => {
    const m = mapRef.current
    if (!m || selectedId === centeredId.current) return
    centeredId.current = selectedId
    const town = towns.find((t) => t.id === selectedId)
    if (!town) return
    const overviewZoom = m.cameraForBounds(text.bounds, { padding })?.zoom ?? 0
    const at = m.project([town.lon, town.lat])
    const { width, height } = m.getContainer().getBoundingClientRect()
    const inView =
      at.x >= padding.left &&
      at.x <= width - padding.right &&
      at.y >= padding.top &&
      at.y <= height - padding.bottom
    if (m.getZoom() > overviewZoom + 0.5 || !inView) {
      m.easeTo({ center: [town.lon, town.lat], padding, duration: reducedMotion() ? 0 : 700 })
    }
  }, [selectedId, towns, padding])

  useImperativeHandle(apiRef, () => ({
    zoomTo: ({ lon, lat }) =>
      mapRef.current?.flyTo({
        center: [lon, lat],
        zoom: TOWN_ZOOM,
        padding,
        duration: reducedMotion() ? 0 : 900,
      }),
  }))

  const onMove = (e: MapLayerMouseEvent) => {
    const id = (e.features?.[0]?.properties?.id as string | undefined) ?? null
    if (id !== hoverDistrict) setHoverDistrict(id)
  }

  const onClick = (e: MapLayerMouseEvent) => {
    const id = e.features?.[0]?.properties?.id as string | undefined
    const town = id && districtTown.get(id)
    if (town) onSelectTown(town)
  }

  const scale = scaleBar(view.zoom, view.lat)

  return (
    <div className="eco-map relative size-full">
      <MapGL
        ref={mapRef}
        mapStyle={style}
        initialViewState={{ bounds: text.bounds, fitBoundsOptions: { padding } }}
        maxBounds={text.maxBounds}
        minZoom={5.5}
        maxZoom={12}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        cooperativeGestures
        locale={text.gestures}
        attributionControl={false}
        interactiveLayerIds={["district-hit"]}
        cursor={hoverDistrict ? "pointer" : "grab"}
        onMouseMove={onMove}
        onMouseLeave={() => setHoverDistrict(null)}
        onClick={onClick}
        onMove={(e) => setView({ zoom: e.viewState.zoom, lat: e.viewState.latitude })}
        aria-label={text.ariaLabel}
      >
        {oblast && (
          <Source id="oblast" type="geojson" data={oblast}>
            <Layer id="oblast-land" type="fill" paint={{ "fill-color": colors.land }} />
          </Source>
        )}

        <Source id="districts" type="geojson" data={districtData} promoteId="id">
          <Layer
            id="district-hit"
            type="fill"
            paint={{
              "fill-color": colors.outline,
              "fill-opacity": ["case", ["==", ["get", "id"], hoverDistrict ?? ""], 0.06, 0],
            }}
          />
          <Layer
            id="district-line"
            type="line"
            layout={{ visibility: shown.districts ? "visible" : "none" }}
            paint={{ "line-color": colors.district, "line-width": 0.8 }}
          />
          {/* Приблизили город — границы районов нужны для ориентира, даже если выключены */}
          <Layer
            id="district-line-zoomed"
            type="line"
            minzoom={DISTRICTS_FROM_ZOOM}
            layout={{ visibility: shown.districts ? "none" : "visible" }}
            paint={{ "line-color": colors.district, "line-width": 0.8 }}
          />
        </Source>

        {rivers && (
          <Source id="rivers" type="geojson" data={rivers}>
            <Layer
              id="rivers-minor"
              type="line"
              filter={["!", ["get", "major"]]}
              layout={{ visibility: shown.rivers ? "visible" : "none", "line-cap": "round" }}
              paint={{ "line-color": colors.river, "line-width": 0.8, "line-opacity": 0.55 }}
            />
            <Layer
              id="rivers-major"
              type="line"
              filter={["get", "major"]}
              layout={{ visibility: shown.rivers ? "visible" : "none", "line-cap": "round" }}
              paint={{
                "line-color": colors.river,
                "line-width": ["interpolate", ["linear"], ["zoom"], 6, 1.2, 10, 2.4],
              }}
            />
          </Source>
        )}

        {oblast && (
          <Source id="oblast-outline" type="geojson" data={oblast}>
            <Layer
              id="oblast-line"
              type="line"
              layout={{ "line-join": "round" }}
              paint={{ "line-color": colors.outline, "line-width": 1.6, "line-dasharray": [3, 1.2] }}
            />
          </Source>
        )}

        {shown.labels &&
          text.neighbours.map((n) => (
            <Marker
              key={n.label}
              longitude={n.lon}
              latitude={n.lat}
              anchor="center"
              style={{ pointerEvents: "none" }}
            >
              <span className="text-[11px] font-semibold tracking-[0.14em] whitespace-nowrap text-muted-foreground/70 uppercase">
                {n.label}
              </span>
            </Marker>
          ))}

        {shown.rivers &&
          riverLabels.map((r) => (
            <Marker
              key={r.name}
              longitude={r.lon}
              latitude={r.lat}
              anchor={r.side === "left" ? "right" : r.side === "right" ? "left" : "top"}
              style={{ pointerEvents: "none" }}
            >
              <span
                className={cn(
                  "block text-[13px] text-map-river-label italic",
                  r.side === "left" && "mr-1.5",
                  r.side === "right" && "ml-1.5",
                  r.side === "below" && "mt-1",
                )}
              >
                {r.name}
              </span>
            </Marker>
          ))}

        <Marker
          longitude={text.npp.lon}
          latitude={text.npp.lat}
          anchor="center"
          style={{ pointerEvents: "none" }}
        >
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground">
            <span aria-hidden="true">✕</span>
            {text.npp.label}
          </span>
        </Marker>

        {places.map((p) => (
          <Marker key={p.id} longitude={p.lon} latitude={p.lat} anchor="center">
            <button
              type="button"
              aria-label={p.name}
              onClick={(e) => {
                e.stopPropagation()
                setOpenPlace(p)
              }}
              className={cn(
                "block cursor-pointer border-2 border-background",
                p.kind === "oopt" ? "size-3 rotate-45 bg-success" : "size-3.5 rounded-full",
                p.kind === "clean" && "bg-success",
                p.kind === "problem" && (p.severity === "high" ? "bg-destructive" : "bg-aqi-moderate"),
              )}
            />
          </Marker>
        ))}

        {/* Участки рек рядом с городами — рисуем раньше городов, чтобы подписи городов были сверху */}
        {waterSections.map((w) => (
          <Marker key={w.name} longitude={w.location.lon} latitude={w.location.lat} anchor="center">
            <button
              type="button"
              aria-label={w.name}
              onClick={(e) => {
                e.stopPropagation()
                setOpenWater(w)
              }}
              className="grid size-4 cursor-pointer place-items-center rounded-full border-2 bg-background text-map-river-label shadow-sm"
              style={{
                borderColor:
                  w.worst > 1.5
                    ? "var(--level-high)"
                    : w.worst > 1
                      ? "var(--level-elevated)"
                      : "var(--map-river)",
              }}
            >
              <Droplets aria-hidden="true" className="size-2.5" />
            </button>
          </Marker>
        ))}

        {towns.map((t) => {
          const category = shown.air ? aqiCategory(t.aqi) : null
          const selected = t.id === selectedId
          const gomel = t.name === "Гомель"
          const left = text.labelsLeft.includes(t.name)
          return (
            <Marker
              key={t.id}
              longitude={t.lon}
              latitude={t.lat}
              anchor={left ? "right" : "left"}
              style={left ? { marginRight: -6 } : { marginLeft: -6 }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectTown(t.id)
                }}
                aria-pressed={selected}
                aria-label={category ? `${t.name}: AQI ${Math.round(t.aqi!)}, ${category.label}` : t.name}
                className={cn(
                  "group flex cursor-pointer items-center gap-2 rounded-full focus-visible:outline-2 focus-visible:outline-ring",
                  left && "flex-row-reverse",
                )}
              >
                <span
                  className={cn(
                    "block shrink-0 rounded-full transition-[box-shadow,transform]",
                    category ? "size-3 ring-2 ring-background" : "size-1.5 bg-foreground",
                    selected && "scale-125 shadow-[0_0_0_4px_var(--map-bg),0_0_0_6px_var(--focus)]",
                  )}
                  style={category ? { background: category.color } : undefined}
                />
                {(shown.labels || selected || gomel) && (
                  <span
                    className={cn(
                      "whitespace-nowrap text-foreground [text-shadow:0_0_3px_var(--map-bg),0_0_6px_var(--map-bg)] group-hover:underline",
                      gomel ? "text-[17px] font-semibold" : "text-[13px]",
                      selected && "font-semibold",
                    )}
                  >
                    {t.name}
                  </span>
                )}
              </button>
            </Marker>
          )
        })}

        {shown.reports &&
          reports.map((r) => (
            <Marker key={r.id} longitude={r.lon} latitude={r.lat} anchor="center">
              <button
                type="button"
                aria-label={`${categoryLabels[r.category]}, ${statusLabels[r.status].toLowerCase()}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenReport(r)
                }}
                className="grid size-6 cursor-pointer place-items-center rounded-full border border-foreground/80 bg-background text-foreground shadow-sm"
              >
                <ReportIcon category={r.category} className="size-3.5" />
              </button>
            </Marker>
          ))}

        {openReport && (
          <Popup
            longitude={openReport.lon}
            latitude={openReport.lat}
            anchor="bottom"
            offset={16}
            closeButton={false}
            closeOnClick
            onClose={() => setOpenReport(null)}
            className="eco-popup"
          >
            <p className="font-medium">{categoryLabels[openReport.category]}</p>
            <p className="mt-0.5 text-muted-foreground">
              {statusLabels[openReport.status]} · {openReport.created}
            </p>
          </Popup>
        )}

        {openWater && (
          <Popup
            longitude={openWater.location.lon}
            latitude={openWater.location.lat}
            anchor="bottom"
            offset={16}
            closeButton={false}
            closeOnClick
            onClose={() => setOpenWater(null)}
            className="eco-popup"
            maxWidth="280px"
          >
            <p className="font-medium">{openWater.name}</p>
            <p className="text-[12px] text-muted-foreground">{text.water.quarter(waterQuarter)}</p>
            {openWater.exceedances.length ? (
              <ul className="mt-1.5 space-y-0.5">
                {openWater.exceedances.map((e) => (
                  <li key={`${e.post}-${e.indicator}-${e.month}`} className="flex justify-between gap-3">
                    <span>{indicators[e.indicator]?.short ?? e.indicator}</span>
                    <span
                      className="tabular-nums"
                      style={{ color: e.ratio > 1.5 ? "var(--level-high)" : "var(--level-elevated)" }}
                    >
                      ×{formatNumber(e.ratio, e.ratio < 1.1 ? 2 : 1)} · {months[e.month - 1]}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1.5">{text.water.clean}</p>
            )}
            <a href="#water" className="mt-2 inline-block text-link hover:text-link-hover">
              {text.water.more} →
            </a>
          </Popup>
        )}

        {openPlace && (
          <Popup
            longitude={openPlace.lon}
            latitude={openPlace.lat}
            anchor="bottom"
            offset={14}
            closeButton={false}
            closeOnClick
            onClose={() => setOpenPlace(null)}
            className="eco-popup"
          >
            <p className="font-medium">{openPlace.name}</p>
            {openPlace.note && <p className="mt-0.5 text-muted-foreground">{openPlace.note}</p>}
          </Popup>
        )}
      </MapGL>

      {/* Низ карты: линейка и атрибуция по центру, «Вся область» и зум справа (§10.4) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4">
        <div className="pointer-events-auto flex min-w-0 flex-col gap-1.5 lg:ml-[300px]">
          <div className="flex items-end gap-2 text-[11px] text-muted-foreground">
            <span
              aria-hidden="true"
              className="h-1.5 border-x border-b border-muted-foreground"
              style={{ width: scale.px }}
            />
            <span className="whitespace-nowrap tabular-nums">{scale.km} км</span>
          </div>
          <p className="hidden truncate text-[11px] text-muted-foreground/80 lg:block">{text.attribution}</p>
        </div>
        <div className="pointer-events-auto flex shrink-0 gap-2">
          <button
            type="button"
            onClick={fitOblast}
            className="h-9 cursor-pointer rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            {text.controls.oblast}
          </button>
          <div className="flex overflow-hidden rounded-md bg-primary text-primary-foreground shadow-sm">
            <button
              type="button"
              aria-label={text.controls.zoomOut}
              onClick={() => mapRef.current?.zoomOut()}
              className="grid size-9 cursor-pointer place-items-center hover:bg-primary/90"
            >
              <Minus className="size-4" />
            </button>
            <button
              type="button"
              aria-label={text.controls.zoomIn}
              onClick={() => mapRef.current?.zoomIn()}
              className="grid size-9 cursor-pointer place-items-center border-l border-primary-foreground/10 hover:bg-primary/90"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
