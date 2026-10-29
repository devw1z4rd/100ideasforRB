import { memo, useMemo, useState, type PointerEvent } from "react"
import { air, levelLabels, type PollutantInfo } from "@/content/air"
import { normLevel, type DailyRow, type NormLevel, type PointSummary } from "@/lib/airStats"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { formatDayLong, levelColor } from "./format"

type Props = {
  rows: readonly DailyRow[]
  days: readonly string[]
  names: ReadonlyMap<string, string>
  pollutant: PollutantInfo
  summaries: ReadonlyMap<string, PointSummary>
  selected: string
  onSelect: (id: string) => void
  hoveredDay: string | null
  onHoverDay: (day: string | null) => void
}

const levels: readonly NormLevel[] = ["ok", "elevated", "high"]

/**
 * «Где и когда было выше нормы»: строка — город, клетка — сутки, цвет — уровень относительно нормы ВОЗ.
 * Все города и все дни сразу, ничего не усреднено. Строки — от города с наибольшим числом плохих дней.
 */
export function TownStrip({
  rows,
  days,
  names,
  pollutant,
  summaries,
  selected,
  onSelect,
  hoveredDay,
  onHoverDay,
}: Props) {
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null)

  const values = useMemo(() => {
    const byPoint = new Map<string, Map<string, number>>()
    for (const r of rows) {
      const m = byPoint.get(r.point) ?? new Map<string, number>()
      m.set(r.day, r[`${pollutant.key}_avg`])
      byPoint.set(r.point, m)
    }
    return byPoint
  }, [rows, pollutant.key])

  const order = [...summaries.entries()]
    .sort(
      ([a, x], [b, y]) =>
        y.daysOver - x.daysOver || (names.get(a) ?? "").localeCompare(names.get(b) ?? "", "ru"),
    )
    .map(([id]) => id)

  const dayIndex = hoveredDay ? days.indexOf(hoveredDay) : -1
  const overOnDay = hoveredDay
    ? order.filter((id) => (values.get(id)?.get(hoveredDay) ?? 0) > pollutant.norm).length
    : 0
  const hoveredValue = hoveredDay && hoveredPoint ? values.get(hoveredPoint)?.get(hoveredDay) : undefined

  const track = (e: PointerEvent<HTMLDivElement>, point: string) => {
    const day = (e.target as HTMLElement).dataset.day
    if (!day) return
    setHoveredPoint(point)
    onHoverDay(day)
  }

  return (
    <div className="mt-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="font-heading text-xl font-semibold tracking-[-0.02em]">{air.strip.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{air.strip.lead}</p>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
          {levels.map((level) => (
            <li key={level} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2.5 rounded-sm"
                style={{ background: levelColor[level] }}
              />
              {levelLabels[level]}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 min-h-5 text-[13px] tabular-nums" aria-live="polite">
        {hoveredDay ? (
          <>
            <span className="font-medium">{formatDayLong(hoveredDay)}</span>: выше нормы в {overOnDay} из{" "}
            {order.length} городов
            {hoveredPoint && hoveredValue != null && (
              <>
                {" "}
                · {names.get(hoveredPoint)} — {formatNumber(hoveredValue, 1)} {air.chart.unit}
              </>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">
            {pollutant.label}, норма ВОЗ {pollutant.norm} {air.chart.unit} в сутки
          </span>
        )}
      </p>

      <div className="-mx-4 mt-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div
          className="relative grid grid-cols-[96px_40px_1fr] items-center gap-x-2 gap-y-1 md:grid-cols-[128px_48px_1fr]"
          style={{ minWidth: 160 + days.length * 3, gridTemplateRows: `repeat(${order.length}, auto)` }}
          onPointerLeave={() => {
            setHoveredPoint(null)
            onHoverDay(null)
          }}
        >
          {order.map((id) => (
            <StripRow
              key={id}
              id={id}
              name={names.get(id) ?? ""}
              daysOver={summaries.get(id)?.daysOver ?? 0}
              values={values.get(id)}
              days={days}
              norm={pollutant.norm}
              selected={id === selected}
              onSelect={onSelect}
              onTrack={track}
            />
          ))}
          {dayIndex >= 0 && (
            <div
              aria-hidden="true"
              className="pointer-events-none relative col-start-3 row-[1/-1] self-stretch"
            >
              <div
                className="absolute inset-y-0 outline-1 outline-foreground"
                style={{ left: `${(dayIndex / days.length) * 100}%`, width: `${100 / days.length}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type RowProps = {
  id: string
  name: string
  daysOver: number
  values: ReadonlyMap<string, number> | undefined
  days: readonly string[]
  norm: number
  selected: boolean
  onSelect: (id: string) => void
  onTrack: (e: PointerEvent<HTMLDivElement>, point: string) => void
}

// memo: наведение двигает только рамку дня, тысячи клеток (с начала года — 21 × 300) не перерисовываются
const StripRow = memo(function StripRow({
  id,
  name,
  daysOver,
  values,
  days,
  norm,
  selected,
  onSelect,
  onTrack,
}: RowProps) {
  return (
    <>
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`${name}: ${air.strip.days(daysOver)} ${air.daysOverCaption}`}
        onClick={() => onSelect(id)}
        className={cn(
          "cursor-pointer truncate rounded-sm text-left text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-ring",
          selected ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {name}
      </button>
      <span className="text-right text-[13px] text-muted-foreground tabular-nums">
        {air.strip.days(daysOver)}
      </span>
      <div
        className={cn(
          // Больше 90 дней — без зазоров: при 300 клетках зазоры съели бы треть ширины
          "grid h-4 rounded-[2px]",
          days.length <= 90 && "gap-px",
          selected && "outline-2 outline-offset-1 outline-foreground",
        )}
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
        onPointerMove={(e) => onTrack(e, id)}
        onPointerDown={(e) => onTrack(e, id)}
        onClick={() => onSelect(id)}
      >
        {days.map((day) => {
          const v = values?.get(day)
          return (
            <span
              key={day}
              data-day={day}
              className="h-full"
              style={{ background: v == null ? "var(--muted)" : levelColor[normLevel(v, norm)] }}
            />
          )
        })}
      </div>
    </>
  )
})
