import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { air, levelLabels, type PollutantInfo } from "@/content/air"
import { normLevel, type SeriesPoint } from "@/lib/airStats"
import { formatNumber } from "@/lib/format"
import { formatDay, formatDayLong, levelColor } from "./format"

type Props = {
  series: readonly SeriesPoint[]
  pointId: string
  townName: string
  names: ReadonlyMap<string, string>
  pollutant: PollutantInfo
  hoveredDay: string | null
  onHoverDay: (day: string | null) => void
}

const tick = { fontSize: 12, fill: "var(--muted-foreground)" }
const value1 = (v: number) => formatNumber(v, 1)

/**
 * Выбранный город (линия) на фоне разброса по всем городам (серая полоса) и суточная норма ВОЗ (пунктир).
 * Один показатель за раз: у каждого своя норма, на общей оси они бы не читались.
 */
export default function AirChart({
  series,
  pointId,
  townName,
  names,
  pollutant,
  hoveredDay,
  onHoverDay,
}: Props) {
  const top = Math.max(pollutant.norm * 1.3, ...series.map((s) => s.band?.[1] ?? 0))
  const over = series.filter((s) => s.value != null && s.value > pollutant.norm).length
  // Когда город сам худший, верх серой полосы совпадает с его линией — говорим это словами
  const withData = series.filter((s) => s.band).length
  const worstDays = series.filter((s) => s.maxPoint === pointId).length
  const bestDays = series.filter((s) => s.minPoint === pointId).length

  return (
    <figure className="flex h-full flex-col">
      <p className="mb-2 text-sm">{air.chart.rank(townName, worstDays, bestDays, withData)}</p>
      <figcaption className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-0.5 w-5 bg-foreground" />
          {pollutant.label} · {air.chart.town(townName)}
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-5 rounded-sm bg-input" />
          {air.chart.band}
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="w-5 border-t border-dashed border-foreground" />
          {air.chart.norm} — {pollutant.norm} {air.chart.unit}
        </span>
      </figcaption>

      <div
        className="mt-3 min-h-0 flex-1"
        role="img"
        aria-label={`${pollutant.label}, ${townName}: ${air.daysOver(over, series.length)} ${air.daysOverCaption}`}
      >
        <ResponsiveContainer>
          <ComposedChart
            data={series as SeriesPoint[]}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            onMouseMove={(state) => onHoverDay(state.activeLabel != null ? String(state.activeLabel) : null)}
            onMouseLeave={() => onHoverDay(null)}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="day"
              tickFormatter={formatDay}
              tick={tick}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              minTickGap={28}
            />
            <YAxis
              domain={[0, Math.ceil(top)]}
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(v: number) => formatNumber(v)}
            />
            <Area
              dataKey="band"
              fill="var(--input)"
              fillOpacity={0.8}
              stroke="none"
              isAnimationActive={false}
              activeDot={false}
            />
            <ReferenceLine y={pollutant.norm} stroke="var(--foreground)" strokeDasharray="4 4" />
            {hoveredDay && <ReferenceLine x={hoveredDay} stroke="var(--muted-foreground)" />}
            <Line
              dataKey="value"
              stroke="var(--foreground)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "var(--foreground)", stroke: "var(--background)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Tooltip
              cursor={false}
              isAnimationActive={false}
              content={(props) => (
                <ChartTooltip {...props} townName={townName} names={names} norm={pollutant.norm} />
              )}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}

function ChartTooltip({
  active,
  payload,
  townName,
  names,
  norm,
}: {
  // Нужны только active и payload из пропсов Tooltip Recharts
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
  townName: string
  names: ReadonlyMap<string, string>
  norm: number
}) {
  const point = payload?.[0]?.payload as SeriesPoint | undefined
  if (!active || !point) return null
  const level = point.value != null ? normLevel(point.value, norm) : null

  return (
    <div className="max-w-64 rounded-lg border border-border bg-popover px-3 py-2 text-[13px] text-popover-foreground shadow-sm">
      <p className="font-medium">{formatDayLong(point.day)}</p>
      {point.value != null && level ? (
        <p className="mt-1 flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full"
            style={{ background: levelColor[level] }}
          />
          <span>
            {townName}: <span className="font-medium tabular-nums">{value1(point.value)}</span>{" "}
            {air.chart.unit}
            {level !== "ok" && ` · ${air.aboveNorm(point.value, norm)}`}
            <span className="sr-only"> — {levelLabels[level]}</span>
          </span>
        </p>
      ) : (
        <p className="mt-1 text-muted-foreground">{townName}: нет данных</p>
      )}
      {point.band && point.minPoint && point.maxPoint && (
        <p className="mt-1 text-muted-foreground">
          {air.chart.range(
            value1(point.band[0]),
            names.get(point.minPoint) ?? "",
            value1(point.band[1]),
            names.get(point.maxPoint) ?? "",
          )}
        </p>
      )}
    </div>
  )
}
