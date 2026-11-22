import { intlLocale } from "@/lib/locale"
import { useMemo, useRef, useState, type PointerEvent } from "react"
import { air, levelLabels, type PollutantInfo } from "@/content/air"
import {
  buckets as toBuckets,
  normLevel,
  type DailyRow,
  type NormLevel,
  type PointSummary,
  type Range,
} from "@/lib/airStats"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useWidth } from "@/lib/useWidth"
import { formatDay, formatDayLong, levelColor } from "./format"

type Props = {
  rows: readonly DailyRow[]
  days: readonly string[]
  names: ReadonlyMap<string, string>
  pollutant: PollutantInfo
  summaries: ReadonlyMap<string, PointSummary>
  selected: string
  onSelect: (id: string) => void
  hover: Range | null
  onHover: (range: Range | null) => void
}

const levels: readonly NormLevel[] = ["ok", "elevated", "high"]
const ROW_H = 20
const CELL_H = 14
const GAP = 2
const cellFill = (level: NormLevel | null) =>
  level === null
    ? "var(--muted)"
    : level === "ok"
      ? `color-mix(in oklab, ${levelColor.ok} 35%, transparent)`
      : levelColor[level]

type Cell = { worst: number | null; worstDay: string | null; over: number; total: number }

export function TownStrip({
  rows,
  days,
  names,
  pollutant,
  summaries,
  selected,
  onSelect,
  hover,
  onHover,
}: Props) {
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const width = useWidth(box)
  const cols = useMemo(() => toBuckets(days), [days])
  const weekly = cols.length < days.length

  const order = useMemo(
    () =>
      [...summaries.entries()]
        .sort(
          ([a, x], [b, y]) =>
            y.daysOver - x.daysOver || (names.get(a) ?? "").localeCompare(names.get(b) ?? "", "ru"),
        )
        .map(([id]) => id),
    [summaries, names],
  )

  const cells = useMemo(() => {
    const byPoint = new Map<string, Map<string, number>>()
    for (const r of rows) {
      const m = byPoint.get(r.point) ?? new Map<string, number>()
      m.set(r.day, r[`${pollutant.key}_avg`])
      byPoint.set(r.point, m)
    }
    return new Map(
      order.map((id) => {
        const values = byPoint.get(id)
        return [
          id,
          cols.map((col): Cell => {
            let worst: number | null = null
            let worstDay: string | null = null
            let over = 0
            let total = 0
            for (const d of col.days) {
              const v = values?.get(d)
              if (v == null) continue
              total++
              if (v > pollutant.norm) over++
              if (worst === null || v > worst) {
                worst = v
                worstDay = d
              }
            }
            return { worst, worstDay, over, total }
          }),
        ]
      }),
    )
  }, [rows, order, cols, pollutant.key, pollutant.norm])

  const cellW = width / Math.max(cols.length, 1)
  const gap = cellW > 6 ? GAP : cellW > 3 ? 1 : 0
  const gridH = order.length * ROW_H

  // The grid is drawn once per data and width; hover doesn't redraw it.
  const grid = useMemo(
    () =>
      width > 0 &&
      order.map((id, r) =>
        (cells.get(id) ?? []).map((c, k) => (
          <rect
            key={`${id}-${k}`}
            x={k * cellW + gap / 2}
            y={r * ROW_H + (ROW_H - CELL_H) / 2}
            width={Math.max(cellW - gap, 0.5)}
            height={CELL_H}
            rx={cellW > 6 ? 2 : 0}
            fill={cellFill(c.worst === null ? null : normLevel(c.worst, pollutant.norm))}
          />
        )),
      ),
    [width, order, cells, cellW, gap, pollutant.norm],
  )

  const hoverCol = hover ? cols.findIndex((c) => c.to >= hover.from && c.from <= hover.to) : -1
  const col = hoverCol >= 0 ? cols[hoverCol] : null
  const overTowns =
    hoverCol >= 0 ? order.filter((id) => (cells.get(id)?.[hoverCol]?.over ?? 0) > 0).length : 0
  const hoveredCell = hoverCol >= 0 && hoveredPoint ? cells.get(hoveredPoint)?.[hoverCol] : undefined
  const months = monthMarks(cols)

  const track = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const k = Math.min(
      cols.length - 1,
      Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * cols.length)),
    )
    const r = Math.min(order.length - 1, Math.max(0, Math.floor((e.clientY - rect.top) / ROW_H)))
    setHoveredPoint(order[r] ?? null)
    const c = cols[k]
    if (!hover || hover.from !== c.from || hover.to !== c.to) onHover({ from: c.from, to: c.to })
  }

  return (
    <div className="mt-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="font-heading text-xl font-semibold tracking-[-0.02em]">{air.strip.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {weekly ? air.strip.leadWeeks : air.strip.lead}
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
          {levels.map((level) => (
            <li key={level} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2.5 rounded-sm"
                style={{ background: cellFill(level) }}
              />
              {levelLabels[level]}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 min-h-5 text-[13px] tabular-nums" aria-live="polite">
        {col ? (
          <>
            <span className="font-medium">
              {weekly ? air.strip.week(formatDay(col.from), formatDay(col.to)) : formatDayLong(col.from)}
            </span>
            : {air.strip.overTowns(overTowns, order.length, weekly)}
            {hoveredPoint && hoveredCell?.worst != null && (
              <>
                {" · "}
                {weekly
                  ? air.strip.townWeek(
                      names.get(hoveredPoint) ?? "",
                      hoveredCell.over,
                      hoveredCell.total,
                      formatNumber(hoveredCell.worst, 1),
                    )
                  : air.strip.townDay(names.get(hoveredPoint) ?? "", formatNumber(hoveredCell.worst, 1))}
              </>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">{air.strip.hint(pollutant.label, pollutant.norm)}</span>
        )}
      </p>

      <div className="mt-2 grid grid-cols-[100px_48px_1fr] gap-x-2 md:grid-cols-[128px_48px_1fr]">
        <div className="col-span-2" />
        <div className="relative h-4 text-[11px] text-muted-foreground">
          {width > 0 &&
            months.map((m) => (
              <span key={m.k} className="absolute top-0" style={{ left: m.k * cellW }}>
                {m.label}
              </span>
            ))}
        </div>

        <ul className="col-span-2 flex flex-col">
          {order.map((id) => (
            <li
              key={id}
              className={cn(
                "grid grid-cols-[100px_48px] items-center gap-x-2 rounded-l-md md:grid-cols-[128px_48px]",
                id === selected && "bg-muted",
              )}
              style={{ height: ROW_H }}
            >
              <button
                type="button"
                aria-pressed={id === selected}
                aria-label={`${names.get(id)}: ${air.strip.days(summaries.get(id)?.daysOver ?? 0)} ${air.daysOverCaption}`}
                onClick={() => onSelect(id)}
                className={cn(
                  "cursor-pointer truncate rounded-sm pl-2 text-left text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  id === selected
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {names.get(id)}
              </button>
              <span
                className={cn(
                  "text-right text-[13px] whitespace-nowrap tabular-nums",
                  id === selected ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {air.strip.days(summaries.get(id)?.daysOver ?? 0)}
              </span>
            </li>
          ))}
        </ul>

        <div
          ref={box}
          aria-hidden="true"
          className="relative cursor-pointer touch-pan-y"
          style={{ height: gridH }}
          onPointerMove={track}
          onPointerDown={track}
          onPointerLeave={(e) => {
            if (e.pointerType !== "mouse") return
            setHoveredPoint(null)
            onHover(null)
          }}
          onClick={() => hoveredPoint && onSelect(hoveredPoint)}
        >
          {width > 0 && (
            <svg width={width} height={gridH} className="absolute inset-0">
              {order.indexOf(selected) >= 0 && (
                <rect
                  x={0}
                  y={order.indexOf(selected) * ROW_H}
                  width={width}
                  height={ROW_H}
                  fill="var(--muted)"
                  rx={4}
                />
              )}
              {grid}
              {hoverCol >= 0 && (
                <rect
                  x={hoverCol * cellW}
                  y={0}
                  width={cellW}
                  height={gridH}
                  fill="var(--foreground)"
                  opacity={0.12}
                  rx={2}
                  className="pointer-events-none"
                />
              )}
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}

const monthFormat = new Intl.DateTimeFormat(intlLocale, { month: "short", timeZone: "UTC" })

function monthMarks(cols: ReadonlyArray<{ from: string }>): Array<{ k: number; label: string }> {
  if (cols.length < 2 || cols[0].from.slice(0, 7) === cols[cols.length - 1].from.slice(0, 7)) return []
  const out: Array<{ k: number; label: string }> = []
  let prev = ""
  cols.forEach((c, k) => {
    const month = c.from.slice(0, 7)
    if (month !== prev) out.push({ k, label: monthFormat.format(new Date(`${c.from}T00:00:00Z`)) })
    prev = month
  })
  return out.filter((m, i) => !(i === 0 && out[1] && out[1].k - m.k < 3))
}
