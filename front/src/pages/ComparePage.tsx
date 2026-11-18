import { useMemo } from "react"
import { Link, useSearchParams } from "react-router"
import { useAirDaily, useLatestAir } from "@/api/air"
import { useAirPoints, useDistrictGeometry } from "@/api/reference"
import { useReports, useReportsRealtime } from "@/api/reports"
import { useRiverLevels, useRiverPosts } from "@/api/rivers"
import { useWaterReadings } from "@/api/water"
import { DistrictPair, type PairSide } from "@/components/compare/DistrictPair"
import { DistrictRanking, MetricChips } from "@/components/compare/DistrictRanking"
import type { MapLabel } from "@/components/compare/DistrictMap"
import { Container } from "@/components/layout/Container"
import { PeriodSwitch } from "@/components/sections/air/AirControls"
import { formatDayLong } from "@/components/sections/air/format"
import { Skeleton } from "@/components/ui/skeleton"
import { periods, pollutants } from "@/content/air"
import { compare as text, comparePeriods, metrics } from "@/content/compare"
import { publicStatuses } from "@/content/reports"
import { minskToday, periodRange, summarizeByPoint, type PointSummary, type Pollutant } from "@/lib/airStats"
import {
  countReports,
  districtPoints,
  groupByDistrict,
  perDistrict,
  rankDesc,
  readCompareParams,
  type CompareState,
} from "@/lib/compare"
import { districtAt, fitProjection, geometryPath } from "@/lib/geo"
import { summarizePosts, type PostSummary } from "@/lib/rivers"
import { useDocumentTitle } from "@/lib/useDocumentTitle"
import { cn } from "@/lib/utils"
import { latestQuarter, quarterLabel, sections as waterSections } from "@/lib/water"

const PARAM: Record<keyof CompareState, string> = { metric: "m", period: "p", a: "a", b: "b" }
const MAP_WIDTH = 1000
const h2 = "font-heading text-[clamp(24px,2.6vw,32px)] leading-[1.15] font-semibold tracking-[-0.02em]"
const NO_REPORTS = { total: 0, open: 0, resolved: 0 }

export function ComparePage() {
  useDocumentTitle(text.title)
  const [params, setParams] = useSearchParams()
  const districts = useDistrictGeometry()
  const points = useAirPoints()
  const latest = useLatestAir()
  const posts = useRiverPosts()
  const levels = useRiverLevels()
  const water = useWaterReadings()
  const reports = useReports({ status: publicStatuses })
  useReportsRealtime()

  const list = useMemo(() => districts.data ?? [], [districts.data])
  const names = useMemo(() => new Map(list.map((d) => [d.id, d.name])), [list])
  const state = readCompareParams(
    params,
    list.map((d) => d.name),
    text.defaults,
    comparePeriods,
  )
  const idOf = (name: string) => list.find((d) => d.name === name)?.id ?? ""
  const aId = idOf(state.a)
  const bId = idOf(state.b)

  const set = (patch: Partial<CompareState>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch)) next.set(PARAM[key as keyof CompareState], value)
        return next
      },
      { replace: true, preventScrollReset: true },
    )
  // Write both districts together, otherwise the default second one could equal the new first.
  const selectA = (id: string) => {
    const name = names.get(id)
    if (name) set({ a: name, b: name === state.b ? state.a : state.b })
  }
  const selectB = (id: string) => {
    const name = names.get(id)
    if (name && name !== state.a) set({ a: state.a, b: name })
  }

  const { current } = periodRange(state.period, minskToday())
  const { from, to } = current
  const daily = useAirDaily(from, to)
  const periodShort = periods.find((p) => p.key === state.period)?.short ?? ""

  const towns = useMemo(() => districtPoints(list, points.data ?? []), [list, points.data])

  const air = useMemo(() => {
    const result = new Map<Pollutant, Map<string, PointSummary>>()
    for (const p of pollutants)
      result.set(p.key, perDistrict(summarizeByPoint(daily.data ?? [], p.key, p.norm, { from, to }), towns))
    return result
  }, [daily.data, towns, from, to])

  const reportCounts = useMemo(() => countReports(reports.data ?? [], { from, to }), [reports.data, from, to])

  const metric = metrics.find((m) => m.key === state.metric) ?? metrics[0]
  const values = useMemo(() => {
    const v = new Map<string, number>()
    if (metric.key === "reports") {
      if (reports.data) for (const d of list) v.set(d.id, reportCounts.get(d.id)?.total ?? 0)
    } else for (const [id, s] of air.get(metric.key) ?? []) v.set(id, s.daysOver)
    return v
  }, [metric.key, reports.data, list, reportCounts, air])
  const ranked = useMemo(() => rankDesc(values, names), [values, names])
  const missing = list
    .filter((d) => !values.has(d.id))
    .sort((x, y) => x.name.localeCompare(y.name, "ru"))
    .map((d) => d.id)
  const daysTotal = useMemo(
    () =>
      new Map(
        metric.key === "reports"
          ? []
          : [...(air.get(metric.key) ?? [])].map(([id, s]) => [id, s.daysTotal] as const),
      ),
    [metric.key, air],
  )

  const map = useMemo(() => {
    const shaped = list.filter((d) => d.geometry)
    const projection = fitProjection(
      shaped.map((d) => d.geometry!),
      MAP_WIDTH,
    )
    return {
      projection,
      width: MAP_WIDTH,
      height: projection.height,
      shapes: shaped.map((d) => ({ id: d.id, path: geometryPath(d.geometry!, projection) })),
      dots: (points.data ?? []).map((p) => {
        const [x, y] = projection.project(p.lon, p.lat)
        return { id: p.id, x, y }
      }),
    }
  }, [list, points.data])

  const labels = useMemo(() => {
    const result: MapLabel[] = []
    for (const [id, color] of [
      [aId, "var(--compare-a)"],
      [bId, "var(--compare-b)"],
    ] as const) {
      const dot = map.dots.find((d) => d.id === towns.get(id))
      if (!dot) continue
      const clash = result.some((l) => Math.hypot(l.x - dot.x, l.y + 16 - dot.y) < 40)
      result.push({ x: dot.x, y: clash ? dot.y + 40 : dot.y - 16, text: names.get(id) ?? "", color })
    }
    return result
  }, [aId, bId, map.dots, towns, names])

  const riverSummaries = useMemo(
    () => summarizePosts(posts.data ?? [], levels.data ?? []),
    [posts.data, levels.data],
  )
  const riversBy = useMemo(() => {
    const m = new Map<string, PostSummary[]>()
    for (const s of riverSummaries) m.set(s.post.district, [...(m.get(s.post.district) ?? []), s])
    return m
  }, [riverSummaries])
  const riversDay = riverSummaries.reduce<string | null>(
    (max, s) => (!max || s.latest.day > max ? s.latest.day : max),
    null,
  )

  const quarter = water.data ? latestQuarter(water.data) : null
  const waterBy = useMemo(
    () =>
      water.data && quarter
        ? groupByDistrict(waterSections(water.data, quarter), (s) => s.location, list)
        : new Map<string, ReturnType<typeof waterSections>>(),
    [water.data, quarter, list],
  )

  const side = (id: string): PairSide => ({
    id,
    name: names.get(id) ?? "",
    aqi: latest.data?.get(towns.get(id) ?? "")?.us_aqi ?? null,
    air: new Map(
      pollutants.flatMap((p) => {
        const s = air.get(p.key)?.get(id)
        return s ? [[p.key, s] as const] : []
      }),
    ),
    rivers: riversBy.get(id) ?? [],
    water: waterBy.get(id) ?? [],
    reports: reportCounts.get(id) ?? NO_REPORTS,
  })

  const base = districts.isPending || points.isPending
  const failed = districts.isError || points.isError
  const metricPending = metric.key === "reports" ? reports.isPending : daily.isPending
  const metricFailed = metric.key === "reports" ? reports.isError : daily.isError
  const stale = daily.isPlaceholderData

  return (
    <Container className="py-16 md:py-24">
      <h1 className="font-heading text-[clamp(32px,4vw,48px)] leading-[1.05] font-semibold tracking-[-0.03em]">
        {text.title}
      </h1>
      <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <p className="max-w-[70ch] text-base leading-[1.55] text-fg-secondary">{text.lead}</p>
        <PeriodSwitch value={state.period} onChange={(period) => set({ period })} options={comparePeriods} />
      </div>

      {failed ? (
        <p className="mt-12 text-sm text-muted-foreground">{text.error}</p>
      ) : base ? (
        <div
          className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
          aria-label={text.loading}
        >
          <Skeleton className="aspect-[3/2] w-full rounded-xl" />
          <Skeleton className="h-[480px] w-full rounded-xl" />
        </div>
      ) : (
        <>
          <section aria-labelledby="compare-ranking" className="mt-14">
            <h2 id="compare-ranking" className={h2}>
              {text.ranking.title}
            </h2>
            <div className="mt-6">
              <MetricChips value={metric.key} onChange={(m) => set({ metric: m })} />
            </div>
            <div
              aria-busy={stale}
              className={cn("mt-6 transition-opacity", stale && metric.key !== "reports" && "opacity-50")}
            >
              {metricFailed ? (
                <p className="text-sm text-muted-foreground">{text.error}</p>
              ) : metricPending ? (
                <Skeleton className="aspect-[3/2] w-full rounded-xl lg:w-7/12" />
              ) : metric.key !== "reports" && daily.data?.length === 0 ? (
                <p className="text-sm text-muted-foreground">{text.empty}</p>
              ) : (
                <DistrictRanking
                  metric={metric}
                  ranked={ranked}
                  missing={missing}
                  names={names}
                  daysTotal={daysTotal}
                  periodShort={periodShort}
                  map={map}
                  labels={labels}
                  a={aId}
                  b={bId}
                  onSelect={selectB}
                />
              )}
            </div>
            <p className="mt-6 max-w-[90ch] text-xs leading-[1.5] text-muted-foreground">
              {metric.key === "reports" ? text.ranking.reportsNote : text.ranking.airNote}
            </p>
          </section>

          <section id="pair" aria-labelledby="compare-pair" className="mt-20 scroll-mt-(--header-h)">
            <h2 id="compare-pair" className={h2}>
              {text.pair.title}
            </h2>
            <div aria-busy={stale} className={cn("mt-6 transition-opacity", stale && "opacity-50")}>
              <DistrictPair
                a={side(aId)}
                b={side(bId)}
                districts={list}
                onA={selectA}
                onB={selectB}
                onSwap={() => set({ a: state.b, b: state.a })}
                locate={(lon, lat) => districtAt(list, lon, lat)}
                periodShort={periodShort}
                riversAsOf={riversDay ? formatDayLong(riversDay) : null}
                waterQuarter={quarter ? quarterLabel(quarter) : null}
              />
            </div>
          </section>
        </>
      )}

      <aside className="mt-20 max-w-[70ch] border-t border-border pt-6">
        <h2 className="font-heading text-lg font-semibold tracking-[-0.01em]">{text.whyNoIndex.title}</h2>
        <p className="mt-2 text-sm leading-[1.6] text-fg-secondary">{text.whyNoIndex.text}</p>
        <p className="mt-3 text-sm">
          <Link to="/data" className="font-medium text-link hover:text-link-hover">
            {text.methodology}
          </Link>
        </p>
      </aside>
    </Container>
  )
}
