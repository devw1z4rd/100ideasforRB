import { useInView } from "motion/react"
import { lazy, Suspense, useMemo, useRef, useState } from "react"
import { useAirDaily, useAirToday } from "@/api/air"
import { useAirPoints } from "@/api/reference"
import { PlayInView } from "@/components/PlayInView"
import { HomeSectionShell } from "@/components/sections/HomeSectionShell"
import { Skeleton } from "@/components/ui/skeleton"
import { air, periods, pollutants } from "@/content/air"
import type { HomeSection } from "@/content/home"
import {
  buildSeries,
  daysBetween,
  firstDataDay,
  minskToday,
  periodRange,
  summarizeByPoint,
  todayPoint,
  type Period,
  type Pollutant,
  type Range,
} from "@/lib/airStats"
import { useSelectedTown } from "@/lib/useSelectedTown"
import { useStuck } from "@/lib/useStuck"
import { AirForecast } from "./AirForecast"
import { AirHours } from "./AirHours"
import { PeriodSelect, TownPicker, ViewTabs, type AirView } from "./AirControls"
import { AirSummary } from "./AirSummary"
import { AirTable } from "./AirTable"
import { TownStrip } from "./TownStrip"

const AirChart = lazy(() => import("./AirChart"))

const PANEL_ID = "air-view"
const CHART_H = "min-h-[320px] md:h-[380px]"

type Props = Pick<HomeSection, "id" | "eyebrow" | "title" | "variant">

export function AirSection(section: Props) {
  const points = useAirPoints()
  const [period, setPeriod] = useState<Period>("30d")
  const [pollutant, setPollutant] = useState<Pollutant>("pm2_5")
  const [hover, setHover] = useState<Range | null>(null)
  const [view, setView] = useState<AirView>("town")
  const [sentinel, stuck] = useStuck()
  const chartRef = useRef<HTMLDivElement>(null)
  const chartVisible = useInView(chartRef, { once: true, margin: "600px 0px" })

  const { current, previous } = periodRange(period, minskToday())
  const daily = useAirDaily(previous?.from ?? current.from, current.to)

  const names = useMemo(() => new Map(points.data?.map((p) => [p.id, p.name])), [points.data])
  const [selected, setPointId] = useSelectedTown(points.data)
  const info = pollutants.find((p) => p.key === pollutant)!
  const rows = daily.data
  const firstDay = useMemo(
    () => (rows ? firstDataDay(rows, { from: current.from, to: current.to }) : null),
    [rows, current.from, current.to],
  )
  const from = firstDay && firstDay > current.from ? firstDay : current.from
  const days = useMemo(() => daysBetween(from, current.to), [from, current.to])
  const series = useMemo(
    () => (rows && selected ? buildSeries(rows, pollutant, selected, days) : []),
    [rows, pollutant, selected, days],
  )
  const todayReadings = useAirToday()
  const today = useMemo(
    () =>
      todayReadings.data && selected
        ? todayPoint(todayReadings.data, pollutant, selected, minskToday())
        : null,
    [todayReadings.data, pollutant, selected],
  )
  const summaries = useMemo(
    () =>
      rows ? summarizeByPoint(rows, pollutant, info.norm, { from: current.from, to: current.to }) : new Map(),
    [rows, pollutant, info.norm, current.from, current.to],
  )

  const loading = points.isPending || daily.isPending
  const failed = points.isError || daily.isError
  const stale = daily.isPlaceholderData
  const periodLabel = periods.find((p) => p.key === period)?.short ?? ""

  const openTown = (id: string) => {
    setPointId(id)
    setView("town")
    if (stuck.current) document.getElementById(section.id)?.scrollIntoView()
  }

  return (
    <HomeSectionShell {...section}>
      <div ref={sentinel} aria-hidden="true" />
      {/* Phone: wrappers are display: contents, so only the filter row sticks, within the whole section. */}
      <div className="z-20 bg-background max-md:contents md:sticky md:top-(--header-h) md:-mx-10 md:px-10">
        <div className="max-md:contents md:flex md:items-center md:justify-between md:gap-6 md:border-b md:border-border">
          <div className="max-md:border-b max-md:border-border md:contents">
            <ViewTabs value={view} onChange={setView} controls={PANEL_ID} />
          </div>
          <div className="flex min-w-0 items-center gap-1.5 max-md:sticky max-md:top-(--header-h) max-md:z-20 max-md:-mx-4 max-md:border-b max-md:border-border max-md:bg-background max-md:px-4 max-md:py-2">
            {points.data && selected && (
              <TownPicker
                points={points.data}
                value={selected}
                onChange={setPointId}
                className="flex-1 md:flex-none"
              />
            )}
            {view !== "forecast" && (
              <PeriodSelect value={period} onChange={setPeriod} className="flex-1 md:flex-none" />
            )}
          </div>
        </div>
      </div>

      <div id={PANEL_ID} role="tabpanel" aria-labelledby={`air-tab-${view}`}>
        {failed ? (
          <p className="mt-8 text-sm text-muted-foreground">{air.error}</p>
        ) : loading || !selected ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className={`${CHART_H} w-full rounded-xl`} />
          </div>
        ) : rows && rows.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">{air.empty}</p>
        ) : (
          <div aria-busy={stale} className={stale ? "opacity-50 transition-opacity" : "transition-opacity"}>
            {view === "forecast" ? (
              <PlayInView>
                <AirForecast pointId={selected} townName={names.get(selected) ?? ""} />
              </PlayInView>
            ) : view === "hours" ? (
              <PlayInView>
                <AirHours
                  pointId={selected}
                  townName={names.get(selected) ?? ""}
                  range={current}
                  pollutant={info}
                  onPollutant={setPollutant}
                />
              </PlayInView>
            ) : view === "table" ? (
              <AirTable
                rows={rows ?? []}
                range={current}
                periodLabel={periodLabel}
                names={names}
                selected={selected}
                pollutant={pollutant}
                onOpen={openTown}
              />
            ) : (
              <>
                <PlayInView>
                  <AirSummary
                    rows={rows ?? []}
                    pointId={selected}
                    current={current}
                    previous={previous}
                    value={pollutant}
                    onChange={setPollutant}
                  />
                </PlayInView>

                <div ref={chartRef} className={`mt-8 ${CHART_H}`}>
                  {chartVisible ? (
                    <PlayInView className="size-full">
                      <Suspense fallback={<Skeleton className="size-full rounded-xl" />}>
                        <AirChart
                          series={series}
                          pointId={selected}
                          townName={names.get(selected) ?? ""}
                          names={names}
                          pollutant={info}
                          hover={hover}
                          onHover={setHover}
                          dataFrom={from > current.from ? from : null}
                          today={today}
                        />
                      </Suspense>
                    </PlayInView>
                  ) : (
                    <Skeleton className="size-full rounded-xl" />
                  )}
                </div>

                <TownStrip
                  rows={rows ?? []}
                  days={days}
                  names={names}
                  pollutant={info}
                  summaries={summaries}
                  selected={selected}
                  onSelect={setPointId}
                  hover={hover}
                  onHover={setHover}
                />
              </>
            )}
          </div>
        )}
      </div>

      {(view === "town" || view === "table") && (
        <p className="mt-6 text-xs leading-[1.5] text-muted-foreground">
          {air.note} Период: {periodLabel}.
        </p>
      )}
    </HomeSectionShell>
  )
}
