import { useInView, useReducedMotion } from "motion/react"
import * as m from "motion/react-m"
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router"
import { useAirDaily, useLatestAir } from "@/api/air"
import { useBorders, useOblast, useRivers } from "@/api/geo"
import { parsePbDate } from "@/api/dates"
import { usePlaces } from "@/api/places"
import { useAirPoints, useDistrictGeometry } from "@/api/reference"
import { useReports, useReportsRealtime } from "@/api/reports"
import { useRiverLevels, useRiverPosts } from "@/api/rivers"
import { useWaterReadings } from "@/api/water"
import { loadMapView } from "@/components/map/loadMapView"
import type { MapPlace, MapReport, MapTown } from "@/components/map/types"
import { Hero } from "@/components/sections/Hero"
import { HomeSectionShell } from "@/components/sections/HomeSectionShell"
import { Button } from "@/components/ui/button"
import type { HomeSection } from "@/content/home"
import { map as text } from "@/content/map"
import { cta } from "@/content/nav"
import { publicStatuses } from "@/content/reports"
import { daysBetween, minskToday, periodRange, pointDays } from "@/lib/airStats"
import { districtPoints } from "@/lib/compare"
import { summarizePosts } from "@/lib/rivers"
import { useMediaQuery } from "@/lib/useMediaQuery"
import { cn } from "@/lib/utils"
import { useSelectedTown } from "@/lib/useSelectedTown"
import { latestQuarter, quarterLabel, sections as waterSectionsOf } from "@/lib/water"
import { AirOverview, MapLegend, TownCard } from "./MapOverlays"
import { MapPreview } from "./MapPreview"

// MapLibre (~300 КБ gzip) — отдельный чанк, грузится, когда карта подходит к экрану
const MapView = lazy(loadMapView)

type Props = Pick<HomeSection, "id" | "eyebrow" | "title" | "titleHidden" | "variant">

const dateFormat = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" })
const formatCreated = (value: string) => {
  const date = parsePbDate(value)
  return date ? dateFormat.format(date) : ""
}
// На десктопе слева и справа поверх карты панели — область вписывается между ними
const PADDING_DESKTOP = { top: 48, right: 380, bottom: 80, left: 320 }
// Данные пришли, а код карты (~450 КБ) не загрузился за столько мс — сеть медленная: панели и карта-заглушка
// показываются сразу. На Fast 4G и быстрее код успевает (зазор ~1,2 с), и сцена старта остаётся
const SLOW_NETWORK_MS = 1500
const PADDING_MOBILE = { top: 32, right: 24, bottom: 80, left: 24 }

/**
 * «Карта экологической обстановки» (CLAUDE.md §10.4): тёмная карта области из своих GeoJSON-слоёв,
 * города — по текущему AQI, обращения жителей в реальном времени. Слои проблемных территорий и ООПТ
 * появляются, только когда в базе есть такие записи с источником (§3).
 */
export function MapSection(section: Props) {
  const desktop = useMediaQuery("(min-width: 1024px)")
  const points = useAirPoints()
  const latest = useLatestAir()
  const districts = useDistrictGeometry()
  const oblast = useOblast()
  const rivers = useRivers()
  const borders = useBorders()
  const places = usePlaces()
  const reports = useReports({ status: publicStatuses })
  useReportsRealtime()

  const { current } = periodRange("30d", minskToday())
  const daily = useAirDaily(current.from, current.to)

  const [selectedId, select] = useSelectedTown(points.data)
  // Все слои всегда показаны, выключателей нет. Исключение — подписи городов на телефоне: в области ~300 px
  // они налезают друг на друга, поэтому там подписаны только Гомель и выбранный город
  // Объект — один на ширину экрана: карта под memo и не перерисовывается вместе с панелями
  const shown = useMemo(
    () => ({ air: true, reports: true, rivers: true, labels: desktop, districts: true }),
    [desktop],
  )
  const mapBox = useRef<HTMLDivElement>(null)
  const mapVisible = useInView(mapBox, { once: true, margin: "400px 0px" })
  // Код карты качается сразу, одновременно с данными, а не после них: на медленной сети это секунды
  const [mapLoaded, setMapLoaded] = useState(false)
  useEffect(() => {
    if (mapVisible)
      loadMapView().then(
        () => setMapLoaded(true),
        () => {},
      )
  }, [mapVisible])
  // Карта проявилась (MapView.onReady) — панели вокруг заезжают следом, а не висят над пустой заглушкой.
  // Запасной таймер — если карта не поднялась (нет WebGL), панели всё равно появляются
  const [mapReady, setMapReady] = useState(false)
  // mapShown — настоящая карта нарисована: карта-заглушка (MapPreview) гаснет поверх неё
  const [mapShown, setMapShown] = useState(false)
  const onMapReady = useCallback(() => {
    setMapReady(true)
    setMapShown(true)
  }, [])
  useEffect(() => {
    const t = window.setTimeout(() => setMapReady(true), 9000)
    return () => window.clearTimeout(t)
  }, [])
  // Медленная сеть: данные уже пришли, а код карты (~450 КБ) ещё качается — панели с цифрами показываем
  // сразу, не дожидаясь сцены старта: иначе на 3G «чем дышит город» появлялось бы через десятки секунд
  const dataReady = Boolean(points.data && latest.data)
  useEffect(() => {
    if (!dataReady || mapLoaded) return
    const t = window.setTimeout(() => setMapReady(true), SLOW_NETWORK_MS)
    return () => window.clearTimeout(t)
  }, [dataReady, mapLoaded])
  // Панели заезжают пружиной, когда до них дошла сцена старта карты: на десктопе — с боков (откуда лежат),
  // на телефоне — снизу. Только прозрачность, сдвиг и масштаб — их считает видеокарта; расфокус (filter) был
  // дорогим на больших панелях и рвал сцену на слабом ноутбуке
  const reduceMotion = useReducedMotion()
  const panelMotion = (side: "left" | "right", delay: number) => ({
    initial: reduceMotion
      ? false
      : { opacity: 0, x: desktop ? (side === "left" ? -48 : 48) : 0, y: desktop ? 0 : 24, scale: 0.96 },
    animate: mapReady ? { opacity: 1, x: 0, y: 0, scale: 1 } : undefined,
    transition: { type: "spring" as const, stiffness: 130, damping: 17, mass: 0.9, delay },
  })

  const towns = useMemo<MapTown[]>(
    () =>
      [...(points.data ?? [])]
        .sort((a, b) => a.name.localeCompare(b.name, "ru"))
        .map((p) => ({
          id: p.id,
          name: p.name,
          lat: p.lat,
          lon: p.lon,
          district: p.district ?? "",
          aqi: latest.data?.get(p.id)?.us_aqi ?? null,
        })),
    [points.data, latest.data],
  )

  // Клик по району выбирает его город; у Гомельского района райцентр — сам Гомель
  const districtTown = useMemo(() => districtPoints(districts.data ?? [], towns), [towns, districts.data])

  const districtNames = useMemo(() => new Map(districts.data?.map((d) => [d.id, d.name])), [districts.data])
  // Район в карточке города. У Гомеля их два — г. Гомель и Гомельский район (данные одной точки, на карте одна
  // территория), подписываем районом: «г. Гомель» под «Гомелем» ничего бы не добавил
  const townDistrict = (town: MapTown) =>
    (districts.data ?? [])
      .filter((d) => districtTown.get(d.id) === town.id)
      .map((d) => d.name)
      .find((name) => !name.startsWith("г.")) ?? districtNames.get(town.district)

  const mapReports = useMemo<MapReport[]>(
    () =>
      (reports.data ?? []).map((r) => ({
        id: r.id,
        lat: r.location.lat,
        lon: r.location.lon,
        category: r.category,
        status: r.status,
        created: formatCreated(r.created),
      })),
    [reports.data],
  )

  const allPlaces = useMemo<MapPlace[]>(
    () =>
      (places.data ?? [])
        .filter((p) => p.location && p.source)
        .map((p) => ({
          id: p.id,
          name: p.name,
          lat: p.location!.lat,
          lon: p.location!.lon,
          kind: p.kind,
          severity: p.severity,
          note: p.note,
        })),
    [places.data],
  )
  // Участки рек из последнего квартального обзора Белгидромета — те же данные, что в разделе «Вода»
  const water = useWaterReadings()
  const waterQuarter = water.data ? latestQuarter(water.data) : null
  const waterSections = useMemo(
    () => (water.data && waterQuarter ? waterSectionsOf(water.data, waterQuarter) : []),
    [water.data, waterQuarter],
  )

  // Посты уровня воды Белгидромета — ежедневно, те же данные, что «Уровень воды» в разделе «Вода»
  const riverPosts = useRiverPosts()
  const riverLevels = useRiverLevels()
  const levelPosts = useMemo(
    () => (riverPosts.data && riverLevels.data ? summarizePosts(riverPosts.data, riverLevels.data) : []),
    [riverPosts.data, riverLevels.data],
  )

  const town = towns.find((t) => t.id === selectedId)
  const { from, to } = current
  // PM2.5 выбранного города по дням — полоса из 30 клеток в карточке
  const townDays = useMemo(
    () => (daily.data && town ? pointDays(daily.data, town.id, "pm2_5", daysBetween(from, to)) : []),
    [daily.data, town, from, to],
  )

  const reportsOpen = mapReports.filter((r) => r.status !== "resolved").length
  const reportsResolved = mapReports.length - reportsOpen

  const ready = points.data && districts.data
  // Медленная сеть: данные есть, а код карты не пришёл за 1,5 с — рисуем карту-заглушку на SVG (районы и
  // города по AQI). Настоящая карта тогда появляется без сцены старта, сразу на том же месте (skipIntro)
  const [preview, setPreview] = useState(false)
  useEffect(() => {
    if (!ready || mapLoaded || preview) return
    const t = window.setTimeout(() => setPreview(true), SLOW_NETWORK_MS)
    return () => window.clearTimeout(t)
  }, [ready, mapLoaded, preview])
  // Заглушка гаснет поверх нарисованной карты и убирается из DOM
  const [previewGone, setPreviewGone] = useState(false)
  useEffect(() => {
    if (!mapShown) return
    const t = window.setTimeout(() => setPreviewGone(true), 700)
    return () => window.clearTimeout(t)
  }, [mapShown])
  const padding = desktop ? PADDING_DESKTOP : PADDING_MOBILE

  // Пока карты нет — спокойный фон самой карты (он у панели), а не серый пульс; подпись проявляется через 1,5 с,
  // то есть только на медленной сети: там код карты качается секунды, и пустая панель выглядела бы поломкой
  const mapLoading = !previewGone && (!(ready && mapLoaded) || preview) && (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-10 bg-(--map-bg) transition-opacity duration-500 ease-out",
        mapShown && "opacity-0",
      )}
    >
      {preview && ready && (
        <MapPreview
          districts={districts.data!}
          oblast={oblast.data?.features[0]}
          towns={towns}
          selectedId={selectedId}
          padding={padding}
        />
      )}
      <p
        role="status"
        className={cn(
          "absolute inset-x-0 animate-in text-center text-sm text-muted-foreground delay-1500 duration-700 fill-mode-both fade-in",
          preview ? "bottom-5" : "top-1/2 -translate-y-1/2",
        )}
      >
        {text.loading}
      </p>
    </div>
  )

  return (
    // Панель карты — первая на странице: сверху тот же отступ, что по бокам. Заголовок страницы (H1) — только
    // для скринридеров: на экране его место отдано карте
    <HomeSectionShell
      {...section}
      intro={<Hero className="sr-only" />}
      className="pt-3 pb-8 md:pt-4 md:pb-10"
    >
      {/* overflow-x-clip: панели заезжают с боков — на старте они правее края и давали бы прокрутку вбок */}
      <div className="relative overflow-x-clip">
        {/* Телефон: карта квадратная, по ширине экрана — область видна целиком (в высокой панели MapLibre
            из-за maxBounds показывал её крупнее и обрезал по бокам), а под картой сразу кнопка и цифры.
            С md высота — экран под шапкой: поля сверху и снизу и рамка подложки — 48 px на телефоне, 64 px с md;
            на десктопе подложки нет — только поля, 32 px.
            На десктопе не ниже 640 px, иначе левые панели налезут друг на друга.
            isolate: затемнение MapLibre «прокручивайте с Ctrl» (z-index 99999) не вылезает поверх шапки,
            липких панелей и наших оверлеев на карте, пока страница прокручивается */}
        <div
          ref={mapBox}
          className="relative isolate h-[100vw] max-h-[calc(100svh_-_var(--header-h)_-_48px)] overflow-hidden rounded-xl border border-border bg-(--map-bg) md:h-[calc(100svh_-_var(--header-h)_-_64px)] md:max-h-none lg:h-[max(640px,calc(100svh_-_var(--header-h)_-_32px))] lg:rounded-2xl"
        >
          {mapLoading}
          {ready && mapVisible && (
            <Suspense fallback={null}>
              <MapView
                towns={towns}
                selectedId={selectedId}
                onSelectTown={select}
                districts={districts.data!}
                districtTown={districtTown}
                oblast={oblast.data}
                rivers={rivers.data}
                borders={borders.data}
                reports={mapReports}
                places={allPlaces}
                waterSections={waterSections}
                levelPosts={levelPosts}
                waterQuarter={waterQuarter ? quarterLabel(waterQuarter) : ""}
                shown={shown}
                padding={padding}
                skipIntro={preview}
                onReady={onMapReady}
              />
            </Suspense>
          )}
        </div>

        <p className="mt-2 text-[13px] text-muted-foreground md:hidden">{text.zoomHint}</p>
        <p className="mt-2 text-[11px] text-muted-foreground lg:hidden">{text.attribution}</p>

        {/* Телефон: в шапке кнопка не помещается, а сообщить о проблеме — главное действие с телефона */}
        <Button asChild size="lg" className="mt-3 h-12 w-full text-[15px] sm:hidden">
          <Link to={cta.to}>{cta.label}</Link>
        </Button>

        {/* Десктоп: панели поверх карты (lg:contents); мобила: под картой, обычным потоком */}
        <div className="mt-4 grid gap-4 lg:contents">
          {town && (
            <m.div className="lg:absolute lg:top-4 lg:right-4 lg:w-[340px]" {...panelMotion("right", 0.12)}>
              <TownCard
                town={town}
                districtName={townDistrict(town)}
                reading={latest.data?.get(town.id)}
                days={townDays}
              />
            </m.div>
          )}
          <m.div className="lg:absolute lg:top-4 lg:left-4 lg:w-[280px]" {...panelMotion("left", 0)}>
            <AirOverview
              towns={towns}
              selectedId={selectedId}
              onSelect={select}
              reportsOpen={reportsOpen}
              reportsResolved={reportsResolved}
              intro={mapReady}
            />
          </m.div>
          <m.div className="lg:absolute lg:bottom-4 lg:left-4 lg:w-[280px]" {...panelMotion("left", 0.24)}>
            <MapLegend />
          </m.div>
        </div>
      </div>
    </HomeSectionShell>
  )
}
