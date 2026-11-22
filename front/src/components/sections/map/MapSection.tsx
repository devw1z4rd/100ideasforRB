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

const MapView = lazy(loadMapView)

type Props = Pick<HomeSection, "id" | "eyebrow" | "title" | "titleHidden" | "variant">

const dateFormat = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" })
const formatCreated = (value: string) => {
  const date = parsePbDate(value)
  return date ? dateFormat.format(date) : ""
}
const PADDING_DESKTOP = { top: 48, right: 380, bottom: 80, left: 320 }
// Data arrived but the map code (~450 KB) didn't within this time: slow network — show the panels and the SVG
// preview right away.
const SLOW_NETWORK_MS = 1500
const PADDING_MOBILE = { top: 32, right: 24, bottom: 80, left: 24 }

export function MapSection(section: Props) {
  const desktop = useMediaQuery("(min-width: 1024px)")
  const points = useAirPoints()
  const latest = useLatestAir()
  const districts = useDistrictGeometry()
  const oblast = useOblast()
  const rivers = useRivers()
  const borders = useBorders()
  const places = usePlaces()
  const reports = useReports({ status: publicStatuses, duplicates: "exclude" })
  useReportsRealtime()

  const { current } = periodRange("30d", minskToday())
  const daily = useAirDaily(current.from, current.to)

  const [selectedId, select] = useSelectedTown(points.data)
  const shown = useMemo(
    () => ({ air: true, reports: true, rivers: true, labels: desktop, districts: true }),
    [desktop],
  )
  const mapBox = useRef<HTMLDivElement>(null)
  const mapVisible = useInView(mapBox, { once: true, margin: "400px 0px" })
  const [mapLoaded, setMapLoaded] = useState(false)
  useEffect(() => {
    if (mapVisible)
      loadMapView().then(
        () => setMapLoaded(true),
        () => {},
      )
  }, [mapVisible])
  const [mapReady, setMapReady] = useState(false)
  const [mapShown, setMapShown] = useState(false)
  const onMapReady = useCallback(() => {
    setMapReady(true)
    setMapShown(true)
  }, [])
  useEffect(() => {
    const t = window.setTimeout(() => setMapReady(true), 9000)
    return () => window.clearTimeout(t)
  }, [])
  const dataReady = Boolean(points.data && latest.data)
  useEffect(() => {
    if (!dataReady || mapLoaded) return
    const t = window.setTimeout(() => setMapReady(true), SLOW_NETWORK_MS)
    return () => window.clearTimeout(t)
  }, [dataReady, mapLoaded])
  // Only opacity, translate and scale (GPU): a filter blur was too expensive on large panels.
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

  const districtTown = useMemo(() => districtPoints(districts.data ?? [], towns), [towns, districts.data])

  const districtNames = useMemo(() => new Map(districts.data?.map((d) => [d.id, d.name])), [districts.data])
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
  const water = useWaterReadings()
  const waterQuarter = water.data ? latestQuarter(water.data) : null
  const waterSections = useMemo(
    () => (water.data && waterQuarter ? waterSectionsOf(water.data, waterQuarter) : []),
    [water.data, waterQuarter],
  )

  const riverPosts = useRiverPosts()
  const riverLevels = useRiverLevels()
  const levelPosts = useMemo(
    () => (riverPosts.data && riverLevels.data ? summarizePosts(riverPosts.data, riverLevels.data) : []),
    [riverPosts.data, riverLevels.data],
  )

  const town = towns.find((t) => t.id === selectedId)
  const { from, to } = current
  const townDays = useMemo(
    () => (daily.data && town ? pointDays(daily.data, town.id, "pm2_5", daysBetween(from, to)) : []),
    [daily.data, town, from, to],
  )

  const reportsOpen = mapReports.filter((r) => r.status !== "resolved").length
  const reportsResolved = mapReports.length - reportsOpen

  const ready = points.data && districts.data
  const [preview, setPreview] = useState(false)
  useEffect(() => {
    if (!ready || mapLoaded || preview) return
    const t = window.setTimeout(() => setPreview(true), SLOW_NETWORK_MS)
    return () => window.clearTimeout(t)
  }, [ready, mapLoaded, preview])
  const [previewGone, setPreviewGone] = useState(false)
  useEffect(() => {
    if (!mapShown) return
    const t = window.setTimeout(() => setPreviewGone(true), 700)
    return () => window.clearTimeout(t)
  }, [mapShown])
  const padding = desktop ? PADDING_DESKTOP : PADDING_MOBILE

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
    <HomeSectionShell
      {...section}
      intro={<Hero className="sr-only" />}
      className="pt-3 pb-8 md:pt-4 md:pb-10"
    >
      {/* overflow-x-clip: panels slide in from the sides and would otherwise cause horizontal scroll. */}
      <div className="relative overflow-x-clip">
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

        <Button asChild size="lg" className="mt-3 h-12 w-full text-[15px] sm:hidden">
          <Link to={cta.to}>{cta.label}</Link>
        </Button>

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
