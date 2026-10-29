import { air, levelLabels, pollutants } from "@/content/air"
import { normLevel, summarizeByPoint, type DailyRow, type Pollutant, type Range } from "@/lib/airStats"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { formatDay, levelColor } from "./format"

type Props = {
  rows: readonly DailyRow[]
  pointId: string
  current: Range
  previous: Range | null
  value: Pollutant
  onChange: (p: Pollutant) => void
}

/**
 * Карточки показателей для выбранного города (§10.6): сколько дней из периода выше нормы ВОЗ и худший день —
 * вместо среднего, в котором плохие дни растворяются. Клик выбирает показатель для графика и полосы.
 */
export function PollutantCards({ rows, pointId, current, previous, value, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Показатель"
      className="mt-8 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4"
    >
      {pollutants.map((p) => {
        const now = summarizeByPoint(rows, p.key, p.norm, current).get(pointId)
        const before = previous ? summarizeByPoint(rows, p.key, p.norm, previous).get(pointId) : undefined
        const worst = now?.worst
        const level = worst ? normLevel(worst.value, p.norm) : null
        const active = value === p.key
        return (
          <button
            key={p.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(p.key)}
            className={cn(
              "flex cursor-pointer flex-col rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              active ? "border-foreground" : "border-border hover:border-input hover:bg-muted/50",
            )}
          >
            <span className="flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="font-heading text-lg font-semibold">{p.label}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                норма {p.norm} {air.chart.unit}
              </span>
            </span>
            <span className="mt-0.5 hidden text-xs leading-snug text-muted-foreground sm:block">
              {p.hint}
            </span>

            <span className="mt-3 font-heading text-[26px] leading-none font-semibold tracking-[-0.03em] tabular-nums sm:mt-4 sm:text-[40px]">
              {now ? air.daysOver(now.daysOver, now.daysTotal) : "—"}
            </span>
            <span className="mt-1 text-[13px] text-muted-foreground">
              {air.daysOverCaption}
              {before && <> · {air.previous(before.daysOver)}</>}
            </span>

            {worst && level && (
              <span className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-[13px]">
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: levelColor[level] }}
                />
                <span>
                  {air.worstDay} {formatDay(worst.day)}:{" "}
                  <span className="tabular-nums">{formatNumber(worst.value, 1)}</span> {air.chart.unit}
                  {level !== "ok" && <> · {air.aboveNorm(worst.value, p.norm)}</>}
                  <span className="sr-only"> — {levelLabels[level]}</span>
                </span>
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
