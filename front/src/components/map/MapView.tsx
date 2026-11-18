import "maplibre-gl/dist/maplibre-gl.css"
import { setWorkerUrl, type ExpressionSpecification, type Map as MapLibreMap } from "maplibre-gl"
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url"
import { Droplets, Minus, Plus } from "lucide-react"
import { lazy, memo, Suspense, useEffect, useMemo, useRef, useState } from "react"
import MapGL, {
  Layer,
  Marker,
  Popup,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
  type StyleSpecification,
} from "react-map-gl/maplibre"
import type { BorderFeature, GeoCollection, LineFeature, OblastFeature } from "@/api/geo"
import type { DistrictWithGeometry } from "@/api/reference"
import { map as text } from "@/content/map"
import { categoryLabels, statusLabels } from "@/content/reports"
import type { PostSummary } from "@/lib/rivers"
import type { Section as WaterSection } from "@/lib/water"
import { water as waterText } from "@/content/water"
import { aqiCategory } from "@/lib/aqi"
import { mergeEnclaves } from "@/lib/geo"
import { scaleBar, snapToLines } from "@/lib/mapGeo"
import { cn } from "@/lib/utils"
import { ReportIcon } from "./ReportIcon"
import { RiverTriangle } from "./RiverTriangle"
import { MapTipContent, type MapTip } from "./MapTipContent"
import { clearDrawn, INTRO_MIN_ZOOM, introCamera, playIntro, setDrawn, type IntroStage } from "./intro"
import type { MapPlace, MapReport, MapTown } from "./types"
import { Tooltip } from "@/components/ui/tooltip"

// Окно поста (Radix Dialog, тексты, график) нужно только по щелчку — отдельным чанком, не в коде карты
const RiverPostDialog = lazy(() => import("./RiverPostDialog").then((m) => ({ default: m.RiverPostDialog })))

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
  /** Границы стран и областей вокруг (Natural Earth) */
  borders: GeoCollection<BorderFeature> | undefined
  reports: readonly MapReport[]
  places: readonly MapPlace[]
  /** Участки рек из последнего обзора Белгидромета (§10.8) */
  waterSections: readonly WaterSection[]
  /** «II квартал 2026» — подпись источника во всплывашке */
  waterQuarter: string
  /** Посты уровня воды Белгидромета (§10.8) */
  levelPosts: readonly PostSummary[]
  shown: MapLayersShown
  /** Отступы при «Вся область»: на десктопе слева и справа лежат панели */
  padding: { top: number; right: number; bottom: number; left: number }
  /** Без сцены старта, сразу итоговый кадр: на месте карты уже стояла заглушка MapPreview (медленная сеть) */
  skipIntro?: boolean
  /** Сцена старта дошла до панелей (или её нет при reduced motion) — панели вокруг заезжают */
  onReady?: () => void
}

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
    borderCountry: v("--map-border-country"),
    borderRegion: v("--map-border-region"),
    belarus: v("--map-belarus"),
    wood: v("--map-wood"),
    water: v("--map-water"),
    road: v("--map-road"),
    roadMajor: v("--map-road-major"),
    building: v("--map-building"),
    place: v("--map-place"),
  }
}

type MapColors = ReturnType<typeof readColors>

// Детали при приближении — векторные тайлы OpenFreeMap (OpenMapTiles, данные OSM): лес, водоёмы, дороги,
// застройка и подписи деревень. С этого масштаба и ближе: на обзоре области тайлы не грузятся вовсе.
// Нет интернета — карта остаётся своей, из GeoJSON, просто без этих деталей.
const DETAIL_FROM_ZOOM = 8
/** Вторая волна маркеров (всё, кроме городов) — через столько мс после первой */
const REST_WAVE_MS = 120
/** Слои HTML-маркеров: волны монтируются в другом порядке, поэтому наложение задано явно */
const Z = { labels: 1, places: 2, water: 3, posts: 4, towns: 5, reports: 6 } as const
const OPENFREEMAP = "https://tiles.openfreemap.org/planet"
const GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf"
const fadeIn = (from: number): ExpressionSpecification => [
  "interpolate",
  ["linear"],
  ["zoom"],
  from,
  0,
  from + 0.6,
  1,
]

function detailLayers(c: MapColors): StyleSpecification["layers"] {
  const ofm = { source: "ofm", minzoom: DETAIL_FROM_ZOOM }
  // Толщина растёт с масштабом; base — множитель для класса дороги (выражение-match допустимо внутри стопов,
  // а два зависящих от масштаба выражения в одном свойстве MapLibre не принимает)
  const roadWidth = (base: number | ExpressionSpecification): ExpressionSpecification => [
    "interpolate",
    ["exponential", 1.4],
    ["zoom"],
    8,
    ["*", base, 0.5],
    14,
    ["*", base, 3],
  ]
  return [
    {
      id: "detail-wood",
      type: "fill",
      ...ofm,
      "source-layer": "landcover",
      filter: ["==", ["get", "class"], "wood"],
      paint: { "fill-color": c.wood, "fill-opacity": fadeIn(DETAIL_FROM_ZOOM) },
    },
    {
      id: "detail-water",
      type: "fill",
      ...ofm,
      "source-layer": "water",
      paint: { "fill-color": c.water, "fill-opacity": fadeIn(DETAIL_FROM_ZOOM) },
    },
    {
      id: "detail-waterway",
      type: "line",
      ...ofm,
      minzoom: 10,
      "source-layer": "waterway",
      // Русла — цветом наших рек: когда реки Natural Earth гаснут, реки остаются того же цвета
      paint: {
        "line-color": c.river,
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.6, 14, 1.6],
        "line-opacity": 0.8,
      },
    },
    {
      id: "detail-building",
      type: "fill",
      ...ofm,
      minzoom: 13,
      "source-layer": "building",
      paint: { "fill-color": c.building, "fill-opacity": fadeIn(13) },
    },
    {
      id: "detail-rail",
      type: "line",
      ...ofm,
      minzoom: 9,
      "source-layer": "transportation",
      filter: ["==", ["get", "class"], "rail"],
      paint: { "line-color": c.road, "line-width": 1, "line-dasharray": [3, 2], "line-opacity": fadeIn(9) },
    },
    {
      id: "detail-roads-minor",
      type: "line",
      ...ofm,
      minzoom: 10,
      "source-layer": "transportation",
      filter: ["in", ["get", "class"], ["literal", ["tertiary", "minor"]]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": c.road, "line-width": roadWidth(0.6), "line-opacity": fadeIn(10) },
    },
    {
      id: "detail-roads",
      type: "line",
      ...ofm,
      "source-layer": "transportation",
      filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary"]]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["match", ["get", "class"], ["motorway", "trunk"], c.roadMajor, c.road],
        "line-width": roadWidth(["match", ["get", "class"], ["motorway", "trunk", "primary"], 1, 0.75]),
        "line-opacity": fadeIn(DETAIL_FROM_ZOOM),
      },
    },
  ] as StyleSpecification["layers"]
}

// MapLibre 6 ищет воркер рядом со своим модулем (import.meta.url), а после сборки Vite его там нет —
// отдаём воркер отдельным ассетом и говорим, где он
setWorkerUrl(workerUrl)

const DISTRICTS_FROM_ZOOM = 8
const MIN_ZOOM = 5.3
/** С этого масштаба на телефоне появляются посты, участки рек, места и обращения (до него — только города) */
const EXTRAS_FROM_ZOOM = 6.3
const MAX_ZOOM = 14
/** Шаг двойного щелчка: два уровня — в 4 раза ближе за раз */
const ZOOM_STEP = 2
/** Двойной щелчок по городу — сразу улицы и кварталы */
const TOWN_ZOOM = 12

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** Смесь двух цветов #rrggbb (t — доля второго): подсветка области на старте — заливка с оттенком рек */
function mixHex(a: string, b: string, t: number): string {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return a
  const [x, y] = [rgb(a), rgb(b)]
  return `#${x
    .map((v, i) =>
      Math.round(v + (y[i] - v) * t)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`
}

// Подсказка над маркером: у поста уровня маркер выше точки (треугольник над ней), у обращения — крупнее
const TIP_OFFSET: Record<MapTip["kind"], number> = { report: 16, water: 14, level: 22, place: 12 }

function tipAt(tip: MapTip): { lon: number; lat: number } {
  if (tip.kind === "water") return tip.item.location
  if (tip.kind === "level") return tip.item.post
  return tip.item
}

/**
 * Одна подсказка на карте вместо попапов «по клику»: наведение мыши показывает, уход — прячет (с задержкой,
 * чтобы курсор успел перейти на саму подсказку к ссылке), фокус с клавиатуры — показывает, касание —
 * показывает до касания по карте. Новая подсказка заменяет старую, Esc закрывает.
 */
function useMapTip() {
  const [tip, setTip] = useState<MapTip | null>(null)
  const timer = useRef(0)

  const keepTip = () => window.clearTimeout(timer.current)
  const openTip = (next: MapTip) => {
    keepTip()
    setTip(next)
  }
  const closeTip = () => {
    keepTip()
    setTip(null)
  }
  const closeTipSoon = () => {
    keepTip()
    timer.current = window.setTimeout(() => setTip(null), 200)
  }

  useEffect(() => {
    if (!tip) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setTip(null)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [tip])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const tipHandlers = (next: MapTip) => ({
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && openTip(next),
    onPointerLeave: (e: React.PointerEvent) => e.pointerType === "mouse" && closeTipSoon(),
    onFocus: () => openTip(next),
    onBlur: closeTipSoon,
    onClick: (e: React.MouseEvent) => {
      // Не даём клику дойти до карты: она закрыла бы подсказку и выбрала район под маркером
      e.stopPropagation()
      openTip(next)
    },
  })

  return { tip, tipHandlers, closeTip, keepTip, closeTipSoon }
}

/** Размах внешнего кольца по долготе и широте — чтобы найти, какой из районов объемлет остальные */
function ringSpan(geometry: NonNullable<DistrictWithGeometry["geometry"]>): number {
  const outer =
    geometry.type === "Polygon" ? [geometry.coordinates[0]] : geometry.coordinates.map((p) => p[0])
  const lons = outer.flat().map((p) => p[0])
  const lats = outer.flat().map((p) => p[1])
  return Math.max(...lons) - Math.min(...lons) + Math.max(...lats) - Math.min(...lats)
}

/**
 * Карта области: свой стиль из GeoJSON — область, районы, реки, границы соседей; работает офлайн.
 * При приближении добавляются детали OpenFreeMap (лес, вода, дороги, деревни), если есть интернет.
 */
function MapView({
  towns,
  selectedId,
  onSelectTown,
  districts,
  districtTown,
  oblast,
  rivers,
  borders,
  reports,
  places,
  waterSections,
  waterQuarter,
  levelPosts,
  shown,
  padding,
  skipIntro,
  onReady,
}: Props) {
  const mapRef = useRef<MapRef>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  // Сцена старта (components/map/intro.ts): такт 0 — готовится, 4 — закончилась. При reduced motion её нет
  // eslint-disable-next-line react-hooks/exhaustive-deps -- решается один раз, при создании карты
  const reduce = useMemo(() => reducedMotion() || Boolean(skipIntro), [])
  const [stage, setStage] = useState<IntroStage>(reduce ? 4 : 0)
  const cancelIntro = useRef<(() => void) | null>(null)
  const paddingRef = useRef(padding)
  paddingRef.current = padding
  const colors = useMemo(() => readColors(), [])
  // Карта загружена — для линейки масштаба: она сама слушает движение карты (ScaleBar), а не через состояние
  // MapView — иначе вся карта перерисовывалась бы React на каждом кадре пролёта
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null)
  const stageRef = useRef(stage)
  stageRef.current = stage
  const [hoverDistrict, setHoverDistrict] = useState<string | null>(null)
  // Пришёл хоть один тайл OpenFreeMap — при приближении настоящие русла есть, грубые реки Natural Earth можно гасить
  const [detailLoaded, setDetailLoaded] = useState(false)
  const { tip, tipHandlers, closeTip, keepTip, closeTipSoon } = useMapTip()
  // Окно поста уровня: из подсказки («развернуть») или щелчком по посту; данные — свежие из levelPosts
  const [dialogPostId, setDialogPostId] = useState<string | null>(null)
  const dialogPost = levelPosts.find((p) => p.post.id === dialogPostId) ?? null
  // Окно монтируется с первого открытия и остаётся: иначе не отыграло бы закрытие
  const [dialogUsed, setDialogUsed] = useState(false)
  if (dialogPost && !dialogUsed) setDialogUsed(true)
  const openPostDialog = (postId: string) => {
    closeTip()
    setDialogPostId(postId)
  }

  const style = useMemo<StyleSpecification>(
    () => ({
      version: 8,
      glyphs: GLYPHS,
      sources: { ofm: { type: "vector", url: OPENFREEMAP } },
      layers: [
        { id: "bg", type: "background", paint: { "background-color": colors.bg } },
        ...detailLayers(colors),
      ],
    }),
    [colors],
  )

  // Районы с одним городом воздуха — один контур: Гомель и Гомельский район показывают данные одной точки,
  // поэтому город внутри района не выделяется — «дырка» района заливается, сам город не рисуется
  const districtData = useMemo(() => {
    const groups = new Map<string, DistrictWithGeometry[]>()
    for (const d of districts) {
      if (!d.geometry) continue
      const key = districtTown.get(d.id) ?? d.id
      groups.set(key, [...(groups.get(key) ?? []), d])
    }
    return {
      type: "FeatureCollection" as const,
      features: [...groups.values()].map((group) => {
        // Главный — район, в «дырках» которого лежат остальные: у него внешнее кольцо больше всех
        const main = group.reduce((a, b) => (ringSpan(a.geometry!) >= ringSpan(b.geometry!) ? a : b))
        return {
          type: "Feature" as const,
          properties: { id: main.id, name: main.name },
          geometry: group.length > 1 ? mergeEnclaves(group.map((d) => d.geometry!)) : main.geometry!,
        }
      }),
    }
  }, [districts, districtTown])

  // Район выбранного города: на карте он подсвечен так же, как район под курсором
  const selectedDistrict = districtData.features.find((f) => districtTown.get(f.properties.id) === selectedId)
    ?.properties.id

  const landData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: [
        ...(borders?.features.filter((f) => f.properties.kind === "belarus") ?? []),
        ...(oblast?.features.map((f) => ({ ...f, properties: { ...f.properties, kind: "oblast" } })) ?? []),
      ],
    }),
    [borders, oblast],
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

  // Отступы зависят от ширины (панели на десктопе) — при их смене заново вписываем область. Только при смене
  // отступов, не при окончании сцены (повторное вписывание в конце сдвигало карту); пока идёт сцена, камерой
  // управляет она
  const introPadding = useRef(padding)
  useEffect(() => {
    if (stageRef.current < 4) return
    mapRef.current?.fitBounds(text.bounds, { padding, duration: 0 })
  }, [padding])

  // Сцена закончилась: линии без градиентов, ограничения камеры — как обычно
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (stage < 4 || !map || reduce) return
    clearDrawn(map, { ...drawLayers.outline, ...drawLayers.rivers })
    map.setMinZoom(MIN_ZOOM)
    map.setMaxBounds(text.maxBounds)
    // Отступы сменились посреди сцены (повернули экран) — вписываем заново
    if (introPadding.current !== paddingRef.current) {
      map.fitBounds(text.bounds, { padding: paddingRef.current, duration: 0 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])
  useEffect(() => () => cancelIntro.current?.(), [])

  // Граница области линиями — для «рисования» на старте (у полигона нет line-progress)
  const oblastLines = useMemo(
    () =>
      oblast && {
        type: "FeatureCollection" as const,
        features: oblast.features.flatMap((f) =>
          (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates).map((poly) => ({
            type: "Feature" as const,
            properties: {},
            geometry: { type: "LineString" as const, coordinates: poly[0] },
          })),
        ),
      },
    [oblast],
  )
  const drawLayers = {
    outline: { "oblast-draw": colors.outline },
    rivers: { "rivers-major": colors.river, "rivers-minor": colors.river },
  }
  // Города «выстреливают» волной от Гомеля: чем дальше, тем позже (до ~0,7 с)
  const origin = towns.find((t) => t.name === "Гомель") ?? towns[0]
  const reach = Math.max(1e-6, ...towns.map((t) => Math.hypot(t.lon - origin.lon, t.lat - origin.lat)))
  const popDelay = (lon: number, lat: number) =>
    Math.round((Math.hypot(lon - origin.lon, lat - origin.lat) / reach) * 700)

  // Сменился город (стрелки в карточке, клик по району, выбор в разделе «Воздух»): если карта приближена или город
  // вне видимой части — плавно ведём к нему, сохраняя масштаб. На обзоре всей области все города и так видны.
  const centeredId = useRef(selectedId)
  useEffect(() => {
    const m = mapRef.current
    if (!m || selectedId === centeredId.current) return
    centeredId.current = selectedId
    // Во время сцены старта камерой управляет она: easeTo прервал бы пролёт
    if (stageRef.current < 4) return
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

  const onMove = (e: MapLayerMouseEvent) => {
    const id = (e.features?.[0]?.properties?.id as string | undefined) ?? null
    if (id !== hoverDistrict) setHoverDistrict(id)
  }

  // Двойной щелчок — сразу к точке: она встаёт в центр свободной части карты (с учётом панелей), масштаб
  // меняется на ZOOM_STEP, а не на 1, как у MapLibre. Shift — отдалить. Город — сразу до масштаба улиц
  const zoomTo = (lon: number, lat: number, zoom: number) => {
    const m = mapRef.current
    if (!m) return
    m.flyTo({
      center: [lon, lat],
      zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)),
      padding,
      duration: reducedMotion() ? 0 : 800,
    })
  }
  const onDblClick = (e: MapLayerMouseEvent) => {
    e.preventDefault()
    const m = mapRef.current
    if (!m) return
    const zoom = m.getZoom() + (e.originalEvent.shiftKey ? -ZOOM_STEP : ZOOM_STEP)
    const { lng, lat } = e.lngLat
    // На следующем кадре: перелёт, начатый прямо в обработчике dblclick, MapLibre тут же останавливает
    requestAnimationFrame(() => zoomTo(lng, lat, zoom))
  }
  const zoomToTown = (t: MapTown) => {
    const zoom = mapRef.current?.getZoom() ?? 0
    zoomTo(t.lon, t.lat, zoom < TOWN_ZOOM ? TOWN_ZOOM : zoom + ZOOM_STEP)
  }

  const onClick = (e: MapLayerMouseEvent) => {
    closeTip()
    const id = e.features?.[0]?.properties?.id as string | undefined
    const town = id && districtTown.get(id)
    if (town) onSelectTown(town)
  }

  // Реки Natural Earth — схема 1:10 млн: в приближении их линия уходит от русла. Есть детали OpenFreeMap — гаснут,
  // нет (офлайн) — остаются
  const riverFade = (opacity: number): number | ExpressionSpecification =>
    detailLoaded ? ["interpolate", ["linear"], ["zoom"], 9.5, opacity, 10.5, 0] : opacity

  // Маркеры и подписи (HTML) — только после пролёта: MapLibre двигает каждый HTML-маркер на каждом кадре
  // движения карты, даже скрытый (~60 штук), — во время пролёта это заметная доля кадра на слабом ноутбуке.
  // Две волны: сначала города (они «выстреливают» первыми), через REST_WAVE_MS — остальное, с задержкой
  // анимаций на столько же меньше: на экране тот же ритм, а работа браузера делится на два кадра.
  // Маркеры — в useMemo: наведение, район под курсором, такты сцены и окно поста их не перерисовывают.
  // Обработчики внутри используют только сеттеры состояния и ref — в зависимостях их нет намеренно
  const townsOn = stage >= 3
  const [restOn, setRestOn] = useState(reduce)
  useEffect(() => {
    if (!townsOn || restOn) return
    const id = window.setTimeout(() => setRestOn(true), REST_WAVE_MS)
    return () => window.clearTimeout(id)
  }, [townsOn, restOn])
  const later = (ms: number) => `${Math.max(0, ms - (reduce ? 0 : REST_WAVE_MS))}ms`

  const townMarkers = useMemo(
    () =>
      townsOn && (
        <>
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
                style={left ? { marginRight: -6, zIndex: Z.towns } : { marginLeft: -6, zIndex: Z.towns }}
              >
                {/* С мышью — название, AQI и как приблизить; на телефоне — нативный title */}
                <Tooltip
                  text={text.controls.dblClickTown}
                  delayDuration={400}
                  content={
                    <>
                      <span className="font-medium">{t.name}</span>
                      {category && (
                        <>
                          {" "}
                          · AQI {Math.round(t.aqi!)}, {category.label}
                        </>
                      )}
                      <br />
                      <span className="opacity-75">{text.controls.dblClickTown}</span>
                    </>
                  }
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectTown(t.id)
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      zoomToTown(t)
                    }}
                    aria-pressed={selected}
                    aria-label={category ? `${t.name}: AQI ${Math.round(t.aqi!)}, ${category.label}` : t.name}
                    className={cn(
                      "map-pop group flex cursor-pointer items-center gap-2 rounded-full focus-visible:outline-2 focus-visible:outline-ring",
                      left && "flex-row-reverse",
                    )}
                    style={{ animationDelay: `${popDelay(t.lon, t.lat)}ms` }}
                  >
                    <span
                      className={cn(
                        "relative block shrink-0 rounded-full transition-[box-shadow,transform]",
                        category ? "size-3 ring-2 ring-background" : "size-1.5 bg-foreground",
                        selected && "scale-125 shadow-[0_0_0_4px_var(--map-bg),0_0_0_6px_var(--focus)]",
                      )}
                      style={category ? { background: category.color } : undefined}
                    >
                      {/* Кольцо на старте — как пинг радара, цветом AQI города */}
                      {category && !reduce && (
                        <span
                          aria-hidden="true"
                          className="map-ping pointer-events-none absolute inset-0 rounded-full"
                          style={{
                            background: category.color,
                            animationDelay: `${popDelay(t.lon, t.lat) + 120}ms`,
                          }}
                        />
                      )}
                    </span>
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
                </Tooltip>
              </Marker>
            )
          })}
        </>
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [townsOn, towns, selectedId, shown, reduce, onSelectTown, padding],
  )

  const restMarkers = useMemo(
    () =>
      restOn && (
        <>
          {shown.labels &&
            text.neighbours.map((n) => (
              <Marker
                key={n.label}
                longitude={n.lon}
                latitude={n.lat}
                anchor="center"
                style={{ pointerEvents: "none", zIndex: Z.labels }}
              >
                <span className="map-fade block text-[11px] font-semibold tracking-[0.14em] whitespace-nowrap text-muted-foreground/70 uppercase">
                  {n.label}
                </span>
              </Marker>
            ))}

          {/* Города соседей — тише наших: серая точка и мелкая подпись, без данных и без клика */}
          {shown.labels &&
            text.neighbourTowns.map((t) => (
              <Marker
                key={t.name}
                longitude={t.lon}
                latitude={t.lat}
                anchor="left"
                style={{ pointerEvents: "none", marginLeft: -3, zIndex: Z.labels }}
              >
                <span className="map-fade flex items-center gap-1.5 text-[11px] whitespace-nowrap text-muted-foreground/80">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-muted-foreground/60" />
                  {t.name}
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
                style={{ pointerEvents: "none", zIndex: Z.labels }}
              >
                <span
                  style={{ animationDelay: later(250) }}
                  className={cn(
                    "map-fade block text-[13px] text-map-river-label italic",
                    r.side === "left" && "mr-1.5",
                    r.side === "right" && "ml-1.5",
                    r.side === "below" && "mt-1",
                  )}
                >
                  {r.name}
                </span>
              </Marker>
            ))}

          {places.map((p) => (
            <Marker
              key={p.id}
              className="map-extra"
              longitude={p.lon}
              latitude={p.lat}
              anchor="center"
              style={{ zIndex: Z.places }}
            >
              <button
                type="button"
                aria-label={p.name}
                {...tipHandlers({ kind: "place", item: p })}
                style={{ animationDelay: later(popDelay(p.lon, p.lat) + 450) }}
                className={cn(
                  "map-pop block cursor-pointer border-2 border-background focus-visible:outline-2 focus-visible:outline-ring",
                  p.kind === "oopt" ? "size-3 rotate-45 bg-success" : "size-3.5 rounded-full",
                  p.kind === "clean" && "bg-success",
                  p.kind === "problem" && (p.severity === "high" ? "bg-destructive" : "bg-aqi-moderate"),
                )}
              />
            </Marker>
          ))}

          {/* Участки рек рядом с городами — рисуем раньше городов, чтобы подписи городов были сверху */}
          {waterSections.map((w) => (
            <Marker
              key={w.name}
              className="map-extra"
              longitude={w.location.lon}
              latitude={w.location.lat}
              anchor="center"
              style={{ zIndex: Z.water }}
            >
              <button
                type="button"
                aria-label={w.name}
                {...tipHandlers({ kind: "water", item: w })}
                className="map-pop grid size-4 cursor-pointer place-items-center rounded-full border-2 bg-background text-map-river-label shadow-sm focus-visible:outline-2 focus-visible:outline-ring"
                style={{
                  animationDelay: later(popDelay(w.location.lon, w.location.lat) + 450),
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

          {/* Посты уровня — под городами: пост часто в самом городе, и подпись города должна читаться поверх
              треугольника. Треугольник — над точкой поста, как у Белгидромета */}
          {levelPosts.map((s) => (
            <Marker
              key={s.post.id}
              className="map-extra"
              longitude={s.post.lon}
              latitude={s.post.lat}
              anchor="bottom"
              offset={[0, -3]}
              style={{ zIndex: Z.posts }}
            >
              <button
                type="button"
                aria-label={`${s.post.river}, ${s.post.name}: ${s.latest.level} см, ${waterText.levels.status[s.status]}`}
                {...tipHandlers({ kind: "level", item: s })}
                // Наведение — подсказка, щелчок (и касание на телефоне) — сразу окно с подробностями
                onClick={(e) => {
                  e.stopPropagation()
                  openPostDialog(s.post.id)
                }}
                className="map-pop block cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
                style={{ animationDelay: later(popDelay(s.post.lon, s.post.lat) + 350) }}
              >
                <RiverTriangle trend={s.trend} status={s.status} className="size-4" />
              </button>
            </Marker>
          ))}

          {shown.reports &&
            reports.map((r) => (
              <Marker
                key={r.id}
                className="map-extra"
                longitude={r.lon}
                latitude={r.lat}
                anchor="center"
                style={{ zIndex: Z.reports }}
              >
                <button
                  type="button"
                  aria-label={`${categoryLabels[r.category]}, ${statusLabels[r.status].toLowerCase()}`}
                  {...tipHandlers({ kind: "report", item: r })}
                  className="map-pop grid size-6 cursor-pointer place-items-center rounded-full border border-foreground/80 bg-background text-foreground shadow-sm focus-visible:outline-2 focus-visible:outline-ring"
                  style={{ animationDelay: later(popDelay(r.lon, r.lat) + 500) }}
                >
                  <ReportIcon category={r.category} className="size-3.5" />
                </button>
              </Marker>
            ))}
        </>
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [restOn, towns, shown, riverLabels, places, waterSections, levelPosts, reports],
  )

  return (
    <div
      className={cn(
        "eco-map relative size-full transition-opacity duration-500 ease-out",
        stage >= 1 ? "opacity-100" : "opacity-0",
      )}
      // На обзоре всей области на телефоне видны только города: остальные маркеры (map-extra) в панели
      // шириной с экран слипались в кашу. Появляются при приближении (правило — в index.css)
      data-far=""
      ref={rootRef}
    >
      <MapGL
        ref={mapRef}
        mapStyle={style}
        initialViewState={{ bounds: text.bounds, fitBoundsOptions: { padding } }}
        maxBounds={text.maxBounds}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        doubleClickZoom={false}
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
        onDblClick={onDblClick}
        // Колесо с Ctrl — вдвое быстрее, чем у MapLibre по умолчанию (1/450): к району — за пару щелчков колеса
        onLoad={(e) => {
          const map = e.target
          map.scrollZoom.setWheelZoomRate(1 / 200)
          setMapInstance(map)
          // Атрибут меняется только при переходе через порог — без состояния React: карта не перерисовывается
          const markFar = () => {
            const root = rootRef.current
            if (!root) return
            const far = map.getZoom() < EXTRAS_FROM_ZOOM
            if (far !== root.hasAttribute("data-far")) root.toggleAttribute("data-far", far)
          }
          map.on("zoom", markFar)
          markFar()
          if (reduce) {
            onReady?.()
            return
          }
          // Итоговый план — область с отступами под панели, вписанная ещё с ограничением maxBounds: если лететь
          // к «чистому» вписыванию, в конце, когда ограничение возвращается, MapLibre подтягивал бы карту
          // в границы — заметный сдвиг. Стартовый план — вся Беларусь; ограничения по области и масштабу
          // на время сцены снимаем (страна шире maxBounds области)
          map.fitBounds(text.bounds, { padding: paddingRef.current, duration: 0 })
          introPadding.current = paddingRef.current
          const final = { center: map.getCenter(), zoom: map.getZoom() }
          map.setMinZoom(INTRO_MIN_ZOOM)
          map.setMaxBounds(null)
          map.jumpTo(introCamera(map))
          setDrawn(map, { ...drawLayers.outline, ...drawLayers.rivers }, 0)
          // Сцена — когда всё нарисовано (idle), но не позже чем через 1,5 с, если что-то грузится долго
          let started = false
          const start = () => {
            if (started) return
            started = true
            cancelIntro.current = playIntro(map, final, drawLayers, {
              stage: setStage,
              panels: () => onReady?.(),
            })
          }
          map.once("idle", start)
          window.setTimeout(start, 1500)
        }}
        onSourceData={(e) => {
          if (!detailLoaded && e.sourceId === "ofm" && e.tile) setDetailLoaded(true)
        }}
        aria-label={text.ariaLabel}
      >
        {/* Заливки — под деталями OpenFreeMap (лес и дороги ложатся поверх). Беларусь и область в одном источнике:
            слои создаются вместе, и область всегда над страной, какой бы файл ни загрузился первым */}
        <Source id="land" type="geojson" data={landData}>
          <Layer
            id="belarus-land"
            type="fill"
            beforeId="detail-wood"
            filter={["==", ["get", "kind"], "belarus"]}
            paint={{ "fill-color": colors.belarus }}
          />
          <Layer
            id="oblast-land"
            type="fill"
            beforeId="detail-wood"
            filter={["==", ["get", "kind"], "oblast"]}
            paint={{
              // На обзоре всей Беларуси (такт 1) область подсвечена оттенком рек — видно, куда летим;
              // к посадке (такт 2) остывает до обычной заливки
              "fill-color": stage === 1 ? mixHex(colors.land, colors.river, 0.32) : colors.land,
              "fill-color-transition": { duration: 1200, delay: 0 },
              "fill-opacity": stage >= 1 ? 1 : 0,
              "fill-opacity-transition": { duration: 900, delay: 150 },
            }}
          />
        </Source>

        {borders && (
          <Source id="borders" type="geojson" data={borders}>
            {/* Области соседних стран — проявляются к посадке: на старте видна только Беларусь.
                Отдельными слоями: у выражений по свойствам MapLibre не делает плавных переходов */}
            <Layer
              id="borders-region-near"
              type="line"
              filter={["all", ["==", ["get", "kind"], "region"], ["!", ["get", "blr"]]]}
              layout={{ "line-join": "round" }}
              paint={{
                "line-color": colors.borderRegion,
                "line-width": 1,
                "line-opacity": stage >= 2 ? 1 : 0,
                "line-opacity-transition": { duration: 900, delay: 0 },
              }}
            />
            <Layer
              id="borders-region"
              type="line"
              filter={["all", ["==", ["get", "kind"], "region"], ["get", "blr"]]}
              layout={{ "line-join": "round" }}
              // На обзоре всей Беларуси (сцена старта) области разделены заметнее; к посадке — как обычно
              paint={{
                "line-color":
                  stage <= 1 ? mixHex(colors.borderRegion, colors.outline, 0.3) : colors.borderRegion,
                "line-width": stage <= 1 ? 1.2 : 1,
                "line-color-transition": { duration: 1200, delay: 0 },
                "line-width-transition": { duration: 1200, delay: 0 },
              }}
            />
            <Layer
              id="borders-country"
              type="line"
              filter={["all", ["==", ["get", "kind"], "country"], ["get", "blr"]]}
              layout={{ "line-join": "round" }}
              paint={{
                "line-color": colors.borderCountry,
                "line-width": 1.4,
                "line-dasharray": [4, 3],
              }}
            />
            {/* Границы между соседними странами (Россия — Украина) — к посадке */}
            <Layer
              id="borders-country-near"
              type="line"
              filter={["all", ["==", ["get", "kind"], "country"], ["!", ["get", "blr"]]]}
              layout={{ "line-join": "round" }}
              paint={{
                "line-color": colors.borderCountry,
                "line-width": 1.4,
                "line-dasharray": [4, 3],
                "line-opacity": stage >= 2 ? 1 : 0,
                "line-opacity-transition": { duration: 900, delay: 0 },
              }}
            />
          </Source>
        )}

        <Source id="districts" type="geojson" data={districtData} promoteId="id">
          <Layer
            id="district-hit"
            type="fill"
            paint={{
              "fill-color": colors.outline,
              "fill-opacity": [
                "case",
                ["in", ["get", "id"], ["literal", [hoverDistrict ?? "", selectedDistrict ?? ""]]],
                0.06,
                0,
              ],
            }}
          />
          <Layer
            id="district-line"
            type="line"
            layout={{ visibility: shown.districts ? "visible" : "none" }}
            paint={{
              "line-color": colors.district,
              "line-width": 0.8,
              "line-opacity": stage >= 2 ? 1 : 0,
              "line-opacity-transition": { duration: 900, delay: 0 },
            }}
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
          <Source id="rivers" type="geojson" data={rivers} lineMetrics>
            <Layer
              id="rivers-minor"
              type="line"
              filter={["!", ["get", "major"]]}
              layout={{ visibility: shown.rivers ? "visible" : "none", "line-cap": "round" }}
              paint={{ "line-color": colors.river, "line-width": 0.8, "line-opacity": riverFade(0.55) }}
            />
            <Layer
              id="rivers-major"
              type="line"
              filter={["get", "major"]}
              layout={{ visibility: shown.rivers ? "visible" : "none", "line-cap": "round" }}
              paint={{
                "line-color": colors.river,
                "line-width": ["interpolate", ["linear"], ["zoom"], 6, 1.2, 10, 2.4],
                "line-opacity": riverFade(1),
              }}
            />
          </Source>
        )}

        {/* Подписи деревень и микрорайонов OpenFreeMap — встроенные подписи MapLibre сами не налезают друг на друга.
            Города и посёлки из OSM не подписываем: у 21 города свои подписи */}
        <Layer
          id="detail-places"
          type="symbol"
          source="ofm"
          source-layer="place"
          minzoom={9}
          filter={[
            "any",
            ["in", ["get", "class"], ["literal", ["village", "suburb", "quarter"]]],
            ["all", [">=", ["zoom"], 12], ["in", ["get", "class"], ["literal", ["hamlet", "neighbourhood"]]]],
          ]}
          layout={{
            "text-field": ["coalesce", ["get", "name:ru"], ["get", "name"]],
            "text-font": ["Noto Sans Regular"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 9, 10, 14, 13],
            "text-padding": 4,
          }}
          paint={{
            "text-color": colors.place,
            "text-halo-color": colors.bg,
            "text-halo-width": 1.2,
            "text-opacity": fadeIn(9),
          }}
        />

        {oblast && (
          <Source id="oblast-outline" type="geojson" data={oblast}>
            <Layer
              id="oblast-line"
              type="line"
              layout={{ "line-join": "round" }}
              paint={{
                "line-color": colors.outline,
                "line-width": 1.6,
                "line-dasharray": [3, 1.2],
                "line-opacity": stage >= 2 ? 1 : 0,
                "line-opacity-transition": { duration: 700, delay: 0 },
              }}
            />
          </Source>
        )}
        {/* Сцена старта: граница рисуется сплошной линией по краю области, потом гаснет под пунктиром */}
        {oblastLines && stage < 4 && (
          <Source id="oblast-draw" type="geojson" data={oblastLines} lineMetrics>
            <Layer
              id="oblast-draw"
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{
                "line-color": colors.outline,
                "line-width": 2.2,
                "line-opacity": stage >= 2 ? 0 : 1,
                "line-opacity-transition": { duration: 700, delay: 0 },
              }}
            />
          </Source>
        )}

        {townMarkers}
        {restMarkers}

        {tip && (
          <Popup
            longitude={tipAt(tip).lon}
            latitude={tipAt(tip).lat}
            anchor="bottom"
            offset={TIP_OFFSET[tip.kind]}
            closeButton={false}
            closeOnClick={false}
            // Без автофокуса на ссылке: иначе маркер теряет фокус, и подсказка закрывается сама
            focusAfterOpen={false}
            onClose={closeTip}
            className="eco-popup"
            maxWidth="300px"
          >
            {/* Курсор можно увести с маркера на подсказку (до ссылки «Подробнее») — она не закроется */}
            <div className="px-3.5 py-3" onPointerEnter={keepTip} onPointerLeave={closeTipSoon}>
              <MapTipContent
                tip={tip}
                waterQuarter={waterQuarter}
                onExpand={tip.kind === "level" ? () => openPostDialog(tip.item.post.id) : undefined}
              />
            </div>
          </Popup>
        )}
      </MapGL>

      {dialogUsed && (
        <Suspense fallback={null}>
          <RiverPostDialog
            summary={dialogPost}
            posts={levelPosts}
            sections={waterSections}
            quarter={waterQuarter}
            onSelect={setDialogPostId}
            onClose={() => setDialogPostId(null)}
          />
        </Suspense>
      )}

      {/* Низ карты: линейка и атрибуция по центру, «Вся область» и зум справа (§10.4) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4">
        <div className="pointer-events-auto flex min-w-0 flex-col gap-1.5 lg:ml-[300px]">
          <ScaleBar map={mapInstance} />
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
            <Tooltip content={text.controls.dblClick} side="top">
              <button
                type="button"
                aria-label={text.controls.zoomOut}
                onClick={() => mapRef.current?.zoomOut()}
                className="grid size-9 cursor-pointer place-items-center hover:bg-primary/90"
              >
                <Minus className="size-4" />
              </button>
            </Tooltip>
            <Tooltip content={text.controls.dblClick} side="top">
              <button
                type="button"
                aria-label={text.controls.zoomIn}
                onClick={() => mapRef.current?.zoomIn()}
                className="grid size-9 cursor-pointer place-items-center border-l border-primary-foreground/10 hover:bg-primary/90"
              >
                <Plus className="size-4" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  )
}

// memo: панели вокруг карты (MapSection) перерисовываются, когда заезжают, — карте это ни к чему
export default memo(MapView)

/**
 * Линейка масштаба: сама слушает движение карты (не чаще кадра) и перерисовывает только себя. Раньше масштаб
 * жил в состоянии MapView, и вся карта перерисовывалась React на каждом кадре движения — пролёт рвался
 */
function ScaleBar({ map }: { map: MapLibreMap | null }) {
  const [scale, setScale] = useState(() => scaleBar(7, 52.3))
  useEffect(() => {
    if (!map) return
    let raf = 0
    const update = () => {
      raf = 0
      const next = scaleBar(map.getZoom(), map.getCenter().lat)
      setScale((prev) => (prev.km === next.km && prev.px === next.px ? prev : next))
    }
    const onMove = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    map.on("move", onMove)
    return () => {
      map.off("move", onMove)
      cancelAnimationFrame(raf)
    }
  }, [map])
  return (
    <div className="flex items-end gap-2 text-[11px] text-muted-foreground">
      <span
        aria-hidden="true"
        className="h-1.5 border-x border-b border-muted-foreground"
        style={{ width: scale.px }}
      />
      <span className="whitespace-nowrap tabular-nums">{scale.km} км</span>
    </div>
  )
}
