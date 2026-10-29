import { useInView } from "motion/react"
import { lazy, Suspense, useMemo, useRef, useState, type ReactNode } from "react"
import { useAirDaily, useLatestAir } from "@/api/air"
import { useOblast, useRivers } from "@/api/geo"
import { parsePbDate } from "@/api/dates"
import { usePlaces } from "@/api/places"
import { useAirPoints, useDistrictGeometry } from "@/api/reference"
import { useReports, useReportsRealtime } from "@/api/reports"
import { useRiverLevels, useRiverPosts } from "@/api/rivers"
import { useWaterReadings } from "@/api/water"
import type { MapApi } from "@/components/map/MapView"
import { ReportIcon } from "@/components/map/ReportIcon"
import { RiverTriangle } from "@/components/map/RiverTriangle"
import type { MapPlace, MapReport, MapTown } from "@/components/map/types"
import { HomeSectionShell } from "@/components/sections/HomeSectionShell"
import { Skeleton } from "@/components/ui/skeleton"
import { pollutants } from "@/content/air"
import type { HomeSection } from "@/content/home"
import { map as text } from "@/content/map"
import { publicStatuses } from "@/content/reports"
import { minskToday, periodRange, summarizeByPoint } from "@/lib/airStats"
import { summarizePosts } from "@/lib/rivers"
import { useMediaQuery } from "@/lib/useMediaQuery"
import { useSelectedTown } from "@/lib/useSelectedTown"
import { latestQuarter, quarterLabel, sections as waterSectionsOf } from "@/lib/water"
import { cn } from "@/lib/utils"
import { Droplets } from "lucide-react"
import { AirOverview, MapLegend, TownCard } from "./MapOverlays"

// MapLibre (~250 КБ gzip) — отдельный чанк, грузится, когда карта подходит к экрану
const MapView = lazy(() => import("@/components/map/MapView"))

type Props = Pick<HomeSection, "id" | "eyebrow" | "title" | "variant">
type LayerKey = "air" | "reports" | "levels" | "water" | "problem" | "oopt"

const dateFormat = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" })
const formatCreated = (value: string) => {
  const date = parsePbDate(value)
  return date ? dateFormat.format(date) : ""
}
// На десктопе слева и справа поверх карты панели — область вписывается между ними
const PADDING_DESKTOP = { top: 48, right: 380, bottom: 80, left: 320 }
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
  const places = usePlaces()
  const reports = useReports({ status: publicStatuses })
  useReportsRealtime()

  const { current } = periodRange("30d", minskToday())
  const daily = useAirDaily(current.from, current.to)

  const [selectedId, select] = useSelectedTown(points.data)
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    air: true,
    reports: true,
    levels: true,
    // Качество воды — квартальное и стоит у тех же городов, что и посты уровня: по умолчанию выключено
    water: false,
    problem: true,
    oopt: true,
  })
  // На телефоне область ~300 px — подписи всех городов налезают друг на друга; по умолчанию только Гомель и выбранный
  const [toggles, setToggles] = useState({ rivers: true, labels: desktop, districts: false })
  const apiRef = useRef<MapApi>(null)
  const mapBox = useRef<HTMLDivElement>(null)
  const mapVisible = useInView(mapBox, { once: true, margin: "400px 0px" })

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
  const districtTown = useMemo(() => {
    const byDistrict = new Map(towns.map((t) => [t.district, t.id]))
    const gomel = towns.find((t) => t.name === "Гомель")?.id
    const result = new Map<string, string>()
    for (const d of districts.data ?? []) {
      const town = byDistrict.get(d.id) ?? (d.name === "Гомельский" ? gomel : undefined)
      if (town) result.set(d.id, town)
    }
    return result
  }, [towns, districts.data])

  const districtNames = useMemo(() => new Map(districts.data?.map((d) => [d.id, d.name])), [districts.data])

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

  const problemCount = allPlaces.filter((p) => p.kind !== "oopt").length
  const ooptCount = allPlaces.filter((p) => p.kind === "oopt").length
  const shownPlaces = allPlaces.filter((p) => (p.kind === "oopt" ? layers.oopt : layers.problem))

  const { from, to } = current
  const pm25Norm = pollutants.find((p) => p.key === "pm2_5")!.norm
  const summaries = useMemo(
    () => (daily.data ? summarizeByPoint(daily.data, "pm2_5", pm25Norm, { from, to }) : new Map()),
    [daily.data, pm25Norm, from, to],
  )

  const index = towns.findIndex((t) => t.id === selectedId)
  const town = towns[index]
  const step = (delta: number) =>
    towns.length && select(towns[(index + delta + towns.length) % towns.length].id)

  const reportsOpen = mapReports.filter((r) => r.status !== "resolved").length
  const reportsResolved = mapReports.length - reportsOpen

  const chips: Array<{ key: LayerKey; label: string; count: number; mark: ReactNode }> = [
    {
      key: "air",
      label: text.layers.air,
      count: towns.filter((t) => t.aqi != null).length,
      mark: <span className="size-2.5 rounded-full bg-aqi-good" />,
    },
    {
      key: "reports",
      label: text.layers.reports,
      count: mapReports.length,
      mark: <ReportIcon category="dump" className="size-3.5" />,
    },
    ...(levelPosts.length
      ? [
          {
            key: "levels" as const,
            label: text.layers.levels,
            count: levelPosts.length,
            mark: <RiverTriangle trend="up" status="normal" className="size-3" />,
          },
        ]
      : []),
    ...(waterSections.length
      ? [
          {
            key: "water" as const,
            label: text.layers.water,
            count: waterSections.length,
            mark: <Droplets aria-hidden="true" className="size-3.5" />,
          },
        ]
      : []),
    ...(problemCount
      ? [
          {
            key: "problem" as const,
            label: text.layers.problem,
            count: problemCount,
            mark: <span className="size-2.5 rounded-full bg-destructive" />,
          },
        ]
      : []),
    ...(ooptCount
      ? [
          {
            key: "oopt" as const,
            label: text.layers.oopt,
            count: ooptCount,
            mark: <span className="size-2.5 rotate-45 bg-success" />,
          },
        ]
      : []),
  ]

  const ready = points.data && districts.data

  return (
    <HomeSectionShell {...section}>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Слои карты">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            aria-pressed={layers[c.key]}
            onClick={() => setLayers((l) => ({ ...l, [c.key]: !l[c.key] }))}
            className={cn(
              "inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm whitespace-nowrap transition-colors",
              layers[c.key]
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-input text-muted-foreground hover:text-foreground",
            )}
          >
            {c.mark}
            {c.label}
            <span className="tabular-nums opacity-70">{c.count}</span>
          </button>
        ))}
      </div>

      <div className="relative mt-4">
        <div ref={mapBox} className="h-[440px] overflow-hidden rounded-xl border border-border lg:h-[740px]">
          {ready && mapVisible ? (
            <Suspense fallback={<Skeleton className="size-full rounded-none" />}>
              <MapView
                apiRef={apiRef}
                towns={towns}
                selectedId={selectedId}
                onSelectTown={select}
                districts={districts.data!}
                districtTown={districtTown}
                oblast={oblast.data}
                rivers={rivers.data}
                reports={mapReports}
                places={shownPlaces}
                waterSections={layers.water ? waterSections : []}
                levelPosts={layers.levels ? levelPosts : []}
                waterQuarter={waterQuarter ? quarterLabel(waterQuarter) : ""}
                shown={{ air: layers.air, reports: layers.reports, ...toggles }}
                padding={desktop ? PADDING_DESKTOP : PADDING_MOBILE}
              />
            </Suspense>
          ) : (
            <Skeleton className="size-full rounded-none" />
          )}
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground lg:hidden">{text.attribution}</p>

        {/* Десктоп: панели поверх карты (lg:contents); мобила: под картой, обычным потоком */}
        <div className="mt-4 grid gap-4 lg:contents">
          {town && (
            <TownCard
              className="lg:absolute lg:top-4 lg:right-4 lg:w-[340px]"
              town={town}
              districtName={districtNames.get(town.district)}
              reading={latest.data?.get(town.id)}
              summary={summaries.get(town.id)}
              index={index}
              total={towns.length}
              onPrev={() => step(-1)}
              onNext={() => step(1)}
              onZoom={() => apiRef.current?.zoomTo(town)}
            />
          )}
          <AirOverview
            className="lg:absolute lg:top-4 lg:left-4 lg:w-[280px]"
            towns={towns}
            selectedId={selectedId}
            onSelect={select}
            reportsOpen={reportsOpen}
            reportsResolved={reportsResolved}
          />
          <MapLegend
            className="lg:absolute lg:bottom-20 lg:left-4 lg:w-[280px]"
            toggles={toggles}
            onToggle={(key) => setToggles((t) => ({ ...t, [key]: !t[key] }))}
          />
        </div>
      </div>
    </HomeSectionShell>
  )
}
