import { useMemo } from "react"
import { Area } from "@/components/charts/area"
import { AreaChart } from "@/components/charts/area-chart"
import { useChartStable } from "@/components/charts/chart-context"
import { Grid } from "@/components/charts/grid"
import { ReferenceArea } from "@/components/charts/reference-area"
import { ChartTooltip } from "@/components/charts/tooltip"
import { XAxis } from "@/components/charts/x-axis"
import { YAxis } from "@/components/charts/y-axis"
import { formatDay } from "@/components/sections/air/format"
import { water as waterText } from "@/content/water"
import { formatNumber } from "@/lib/format"
import {
  chartThresholds,
  hasThresholds,
  levelScale,
  riverStatus,
  trendOf,
  type PostSummary,
} from "@/lib/rivers"
import { riverColor } from "./riverColor"
import { RiverTriangle } from "./RiverTriangle"

const levels = waterText.levels

type Row = { date: Date; day: string; level: number; change: number }

export function RiverLevelChart({ summary }: { summary: PostSummary }) {
  const { series, post } = summary
  const { lo, hi, zones } = levelScale(summary)
  const data = useMemo<Row[]>(
    () =>
      series.map((l) => ({
        date: new Date(`${l.day}T05:00:00Z`),
        day: l.day,
        level: l.level,
        change: l.change,
      })),
    [series],
  )
  const labels = useMemo(() => series.map((l) => formatDay(l.day)), [series])

  return (
    <div className="mt-5" aria-label={levels.chartLabel(post.river, post.name)} role="group">
      <AreaChart
        data={data}
        yDomain={[lo, hi]}
        // 40 px bottom: bklit draws date labels 12 px from the bottom.
        margin={{ top: 12, right: 12, bottom: 40, left: 44 }}
        style={{ aspectRatio: "auto", height: 252, touchAction: "pan-y" }}
      >
        {zones.map((z) => (
          <ReferenceArea
            key={z.kind}
            y1={z.to >= hi ? undefined : z.to}
            y2={z.from <= lo ? undefined : z.from}
            fill={riverColor[z.kind]}
            fillOpacity={0.12}
            fadeEdges={false}
            strokeWidth={0}
          />
        ))}
        <Grid horizontal numTicksRows={4} />
        <Area dataKey="level" strokeWidth={2} />
        <ThresholdLines summary={summary} />
        <YAxis numTicks={4} formatValue={(v) => formatNumber(Math.round(v))} />
        <XAxis labels={labels} numTicks={5} />
        <ChartTooltip
          dateLabels={labels}
          content={({ point }) => <Tip row={point as Row} summary={summary} />}
        />
      </AreaChart>
    </div>
  )
}

function ThresholdLines({ summary }: { summary: PostSummary }) {
  const { yScale, innerWidth } = useChartStable()
  return (
    <g aria-hidden="true" pointerEvents="none">
      {chartThresholds(summary).map((t) => {
        const y = yScale(t.value)
        return (
          <g key={t.kind}>
            <line
              x1={0}
              x2={innerWidth}
              y1={y}
              y2={y}
              stroke={riverColor[t.kind]}
              strokeWidth={1.25}
              strokeDasharray="4 4"
            />
            <text x={6} y={y - 5} fontSize={11} fill="var(--muted-foreground)">
              {levels.threshold[t.kind]} · {t.value} {levels.unit}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function Tip({ row, summary }: { row: Row; summary: PostSummary }) {
  const status = riverStatus(row.level, summary.post)
  return (
    <div className="px-3 py-2 text-[12px] leading-snug">
      <p className="flex items-center gap-1.5">
        <span className="text-[15px] font-semibold tabular-nums">
          {formatNumber(row.level)} {levels.unit}
        </span>
        <RiverTriangle trend={trendOf(row.change)} status={status} className="size-2.5" />
        <span className="text-muted-foreground tabular-nums">{levels.change(row.change)}</span>
      </p>
      {hasThresholds(summary.post) && (
        <p className="mt-1 inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2 rounded-full"
            style={{ background: riverColor[status] }}
          />
          {levels.status[status]}
        </p>
      )}
    </div>
  )
}
