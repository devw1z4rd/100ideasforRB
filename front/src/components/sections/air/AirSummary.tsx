import { Info } from "lucide-react"
import { useLatestAir } from "@/api/air"
import { Tooltip } from "@/components/ui/tooltip"
import { air, pollutants } from "@/content/air"
import { AQI_SCALE, aqiCategory } from "@/lib/aqi"
import { minskHour } from "@/lib/airHourly"
import {
  aqiRange,
  normLevel,
  summarizeByPoint,
  type DailyRow,
  type NormLevel,
  type Pollutant,
  type Range,
} from "@/lib/airStats"
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

const text = air.summary
// Дни в норме — бледным, как в полосе «Где и когда»: бросаются в глаза дни выше нормы
const pale = (color: string) => `color-mix(in oklab, ${color} 35%, transparent)`
const dayLevels: readonly NormLevel[] = ["ok", "elevated", "high"]

// Карточка — четыре строки общей сетки (subgrid): заголовок, число, полоса, подпись. Строки выровнены
// по всему ряду карточек, сколько бы строк ни занял текст в соседней.
const cell = "row-span-4 grid grid-rows-subgrid gap-y-2.5 p-3.5 text-left md:p-4"

/**
 * Сводка выбранного города (§10.6) — два разных по смыслу блока, чтобы было видно, что можно выбирать:
 * слева AQI сейчас и дни периода по категориям AQI — спокойная серая плашка без рамки, только информация;
 * справа под заголовком PM2.5 / PM10 / NO₂ / SO₂ — отдельные карточки с рамкой (радиогруппа): сколько дней
 * периода выше нормы ВОЗ, из них выше двух норм, худший день. Выбранная — тёмной рамкой, она идёт на график
 * и в полосу «Где и когда».
 */
export function AirSummary({ rows, pointId, current, previous, value, onChange }: Props) {
  const info = pollutants.find((p) => p.key === value)!

  return (
    <>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)] lg:gap-8">
        <AqiCell rows={rows} pointId={pointId} range={current} />

        <div className="min-w-0">
          <p id="air-pick-title" className="text-[15px] font-semibold">
            {text.pickTitle}
          </p>
          <div
            role="radiogroup"
            aria-labelledby="air-pick-title"
            className="mt-3 grid grid-cols-2 gap-x-2.5 gap-y-2.5 lg:grid-cols-4"
          >
            {pollutants.map((p) => {
              const now = summarizeByPoint(rows, p.key, p.norm, current).get(pointId)
              const before = previous
                ? summarizeByPoint(rows, p.key, p.norm, previous).get(pointId)
                : undefined
              const worst = now?.worst
              const level = worst ? normLevel(worst.value, p.norm) : null
              const active = value === p.key
              const counts: Record<NormLevel, number> = now
                ? {
                    ok: now.daysTotal - now.daysOver,
                    elevated: now.daysOver - now.daysHigh,
                    high: now.daysHigh,
                  }
                : { ok: 0, elevated: 0, high: 0 }
              return (
                <button
                  key={p.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange(p.key)}
                  // Отдельная карточка с рамкой — видно, что её можно выбрать. Выбранная — серой рамкой 2 px
                  // (рамка + inset-тень, без сдвига содержимого) и лёгкой подложкой: чёрная рамка резала глаз
                  className={cn(
                    cell,
                    "cursor-pointer rounded-xl border transition-[border-color,box-shadow,background-color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    active
                      ? "border-muted-foreground/45 bg-muted/50 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--muted-foreground)_45%,transparent)]"
                      : "border-border bg-card hover:border-input hover:bg-muted/40",
                  )}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-heading text-[15px] font-semibold">{p.label}</span>
                    <span className="text-[12px] text-muted-foreground tabular-nums">
                      {text.norm(p.norm)}
                    </span>
                  </span>

                  <span className="flex items-end gap-2">
                    <span className="font-heading text-[34px] leading-[0.85] font-semibold tracking-[-0.03em] tabular-nums md:text-[40px]">
                      {now ? now.daysOver : "—"}
                    </span>
                    {now && (
                      <span className="text-[12px] leading-tight text-muted-foreground">
                        {text.of(now.daysTotal)}
                        <br />
                        {text.over}
                      </span>
                    )}
                  </span>

                  <Bar
                    parts={dayLevels.map((l) => ({
                      key: l,
                      n: counts[l],
                      color: l === "ok" ? pale(levelColor.ok) : levelColor[l],
                    }))}
                  />

                  <span className="text-[12px] leading-snug">
                    {worst && level && (
                      <span className="flex items-baseline gap-1.5">
                        <span
                          aria-hidden="true"
                          className="size-2 shrink-0 translate-y-[-1px] rounded-full"
                          style={{ background: levelColor[level] }}
                        />
                        <span>
                          {text.worst(formatDay(worst.day))}{" "}
                          <span className="font-medium tabular-nums">{formatNumber(worst.value, 1)}</span>
                          {level !== "ok" && (
                            <span className="text-muted-foreground">
                              {" "}
                              · {air.aboveNorm(worst.value, p.norm)}
                            </span>
                          )}
                        </span>
                      </span>
                    )}
                    {before && (
                      <span className="mt-0.5 block text-muted-foreground">
                        {text.previous(before.daysOver)}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
          {/* Что за показатель выбран — одной строкой под карточками, а не в каждой */}
          <p className="mt-3 text-[13px] text-muted-foreground">
            <span className="font-medium text-foreground">{info.label}</span> — {info.hint}.
          </p>
        </div>
      </div>
    </>
  )
}

// Шкала AQI до 200, как на карте: выше — редкость для области, отметка упирается в край
const SCALE_MAX = 200
const scaleSegments = AQI_SCALE.filter((c) => c.min < SCALE_MAX)
const onScale = (v: number) => `${(Math.min(Math.max(v, 0), SCALE_MAX) / SCALE_MAX) * 100}%`

/**
 * AQI города: значение за последний час и где оно на шкале AQI; светлая скобка на шкале — в каких пределах
 * был AQI за период (по худшему часу суток). Шкала прямо показывает, что это другая мерка, чем карточки ВОЗ
 * рядом: «умеренный» AQI ещё не «выше нормы ВОЗ» — это объясняет подсказка у ⓘ, а не абзац текста.
 */
function AqiCell({ rows, pointId, range }: { rows: readonly DailyRow[]; pointId: string; range: Range }) {
  const { data: latest } = useLatestAir()
  const reading = latest?.get(pointId)
  const aqi = reading?.us_aqi
  const category = aqiCategory(aqi)
  const spread = aqiRange(rows, pointId, range)

  return (
    // Заголовок — как над карточками показателей, поэтому верх плашки на одной линии с ними.
    // Сама плашка — только информация: серая, без рамки, не похожа на карточки, которые выбирают
    <div className="flex min-w-0 flex-col">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="text-[15px] font-semibold">{text.aqiTitle}</span>
        {reading && (
          <span className="text-[13px] text-muted-foreground tabular-nums">
            {text.at(String(minskHour(reading.ts).hour).padStart(2, "0"))}
          </span>
        )}
      </p>
      <div className="mt-3 flex flex-col gap-3 rounded-xl bg-muted p-4 md:p-5">
        <span className="flex items-end gap-2">
          <span className="font-heading text-[44px] leading-[0.85] font-semibold tracking-[-0.03em] md:text-[56px]">
            {category ? Math.round(aqi!) : "—"}
          </span>
          <span className="text-[12px] leading-tight text-muted-foreground">
            {category ? (
              <span
                data-aqi-surface={category.level}
                className="inline-block rounded-[4px] bg-(--surface) px-1.5 py-px font-medium text-(--ink) first-letter:uppercase"
              >
                {category.label}
              </span>
            ) : (
              text.noNow
            )}
          </span>
        </span>

        {/* Шкала AQI: цветом — категории, скобка — пределы за период, черта — сейчас */}
        <div className="mt-1">
          <div className="relative py-1.5">
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
              {scaleSegments.map((c) => (
                <span key={c.level} className="flex-1" style={{ background: c.color }} />
              ))}
            </div>
            {spread && (
              <span
                aria-hidden="true"
                className="absolute inset-y-0 rounded-full bg-foreground/10 ring-1 ring-foreground/35"
                style={{
                  left: onScale(spread.min),
                  width: `calc(${onScale(spread.max)} - ${onScale(spread.min)})`,
                  minWidth: 6,
                }}
              />
            )}
            {category && (
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -bottom-0.5 w-[3px] -translate-x-1/2 rounded-full bg-foreground ring-2 ring-muted"
                style={{ left: onScale(aqi!) }}
              />
            )}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground tabular-nums">
            {[0, 50, 100, 150, 200].map((v) => (
              <span key={v}>{v}</span>
            ))}
          </div>
        </div>

        {spread && (
          <p className="flex items-center gap-2 text-[12px] leading-snug text-muted-foreground">
            <span
              aria-hidden="true"
              className="h-2.5 w-4 shrink-0 rounded-full bg-foreground/10 ring-1 ring-foreground/35"
            />
            <span>
              {text.spread(spread.days)}{" "}
              <span className="font-medium text-foreground tabular-nums">
                {text.spreadValues(spread.min, spread.max)}
              </span>
            </span>
            <Tooltip content={text.aqiVsWho}>
              <button
                type="button"
                aria-label={text.aqiVsWho}
                className="ml-auto grid size-5 shrink-0 cursor-help place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
              >
                <Info aria-hidden="true" className="size-3.5" />
              </button>
            </Tooltip>
          </p>
        )}
      </div>
    </div>
  )
}

/** Состав дней периода одной полосой: доля каждой части пропорциональна числу дней */
function Bar({ parts }: { parts: ReadonlyArray<{ key: string; n: number; color: string }> }) {
  const total = parts.reduce((a, p) => a + p.n, 0)
  return (
    <span
      aria-hidden="true"
      // w-full: в столбце (плашка AQI) self-center иначе сжал бы полосу в ноль
      className="summary-bar flex h-2 w-full gap-px self-center overflow-hidden rounded-full bg-muted"
    >
      {total > 0 &&
        parts
          .filter((p) => p.n > 0)
          .map((p) => (
            <span
              key={p.key}
              className="h-full"
              style={{ flexGrow: p.n, flexBasis: 0, background: p.color }}
            />
          ))}
    </span>
  )
}
