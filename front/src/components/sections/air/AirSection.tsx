import { useInView } from "motion/react"
import { lazy, Suspense, useMemo, useRef, useState } from "react"
import { useAirDaily } from "@/api/air"
import { useAirPoints } from "@/api/reference"
import { HomeSectionShell } from "@/components/sections/HomeSectionShell"
import { Skeleton } from "@/components/ui/skeleton"
import { air, periods, pollutants } from "@/content/air"
import type { HomeSection } from "@/content/home"
import {
  buildSeries,
  daysBetween,
  minskToday,
  periodRange,
  summarizeByPoint,
  type Period,
  type Pollutant,
} from "@/lib/airStats"
import { useSelectedTown } from "@/lib/useSelectedTown"
import { AirNow } from "./AirNow"
import { PeriodSwitch, TownPicker } from "./AirControls"
import { PollutantCards } from "./PollutantCards"
import { TownStrip } from "./TownStrip"

// Recharts — самая тяжёлая зависимость секции (~100 КБ gzip): отдельный чанк, грузится, когда график подходит к экрану
const AirChart = lazy(() => import("./AirChart"))

const CHART_H = "h-[280px] md:h-[340px]"

type Props = Pick<HomeSection, "id" | "eyebrow" | "title" | "variant">

/**
 * «Качество атмосферного воздуха» (CLAUDE.md §10.6): выбранный город на фоне всех городов области,
 * дни выше нормы ВОЗ вместо одного среднего. Город, период и показатель выбираются; график и полоса
 * «где и когда» подсвечивают один и тот же день.
 */
export function AirSection(section: Props) {
  const points = useAirPoints()
  const [period, setPeriod] = useState<Period>("30d")
  const [pollutant, setPollutant] = useState<Pollutant>("pm2_5")
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const chartVisible = useInView(chartRef, { once: true, margin: "600px 0px" })

  const { current, previous } = periodRange(period, minskToday())
  const daily = useAirDaily(previous?.from ?? current.from, current.to)

  const names = useMemo(() => new Map(points.data?.map((p) => [p.id, p.name])), [points.data])
  const [selected, setPointId] = useSelectedTown(points.data)
  const info = pollutants.find((p) => p.key === pollutant)!
  const days = useMemo(() => daysBetween(current.from, current.to), [current.from, current.to])

  const rows = daily.data
  const series = useMemo(
    () => (rows && selected ? buildSeries(rows, pollutant, selected, days) : []),
    [rows, pollutant, selected, days],
  )
  const summaries = useMemo(
    () =>
      rows ? summarizeByPoint(rows, pollutant, info.norm, { from: current.from, to: current.to }) : new Map(),
    [rows, pollutant, info.norm, current.from, current.to],
  )

  const loading = points.isPending || daily.isPending
  const failed = points.isError || daily.isError
  // Пока грузится новый период, на экране данные прошлого — приглушаем, чтобы их не приняли за новые
  const stale = daily.isPlaceholderData

  return (
    <HomeSectionShell {...section}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <p className="max-w-[60ch] text-base leading-[1.55] text-fg-secondary">{air.lead}</p>
        <div className="flex flex-wrap items-center gap-3">
          {points.data && selected && (
            <TownPicker points={points.data} value={selected} onChange={setPointId} />
          )}
          <PeriodSwitch value={period} onChange={setPeriod} />
        </div>
      </div>

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
          <AirNow pointId={selected} names={names} onSelect={setPointId} />

          <PollutantCards
            rows={rows ?? []}
            pointId={selected}
            current={current}
            previous={previous}
            value={pollutant}
            onChange={setPollutant}
          />

          <div ref={chartRef} className={`mt-8 ${CHART_H}`}>
            {chartVisible ? (
              <Suspense fallback={<Skeleton className="size-full rounded-xl" />}>
                <AirChart
                  series={series}
                  pointId={selected}
                  townName={names.get(selected) ?? ""}
                  names={names}
                  pollutant={info}
                  hoveredDay={hoveredDay}
                  onHoverDay={setHoveredDay}
                />
              </Suspense>
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
            hoveredDay={hoveredDay}
            onHoverDay={setHoveredDay}
          />
        </div>
      )}

      <p className="mt-6 text-xs leading-[1.5] text-muted-foreground">
        {air.note} Период: {periods.find((p) => p.key === period)?.short}.
      </p>
    </HomeSectionShell>
  )
}
