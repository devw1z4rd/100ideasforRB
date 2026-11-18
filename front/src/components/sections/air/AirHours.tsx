import { useState } from "react"
import { useAirHourly } from "@/api/air"
import { Skeleton } from "@/components/ui/skeleton"
import { air, pollutants, type PollutantInfo } from "@/content/air"
import { hourProfile, hourRange, profileExtremes, type DayFilter, type HourStat } from "@/lib/airHourly"
import { addDays, minskToday, normLevel, type Pollutant, type Range } from "@/lib/airStats"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { levelColor } from "./format"

const text = air.hours
const HOURLY_DAYS = 90
const filters: readonly DayFilter[] = ["all", "weekdays", "weekends"]

export function AirHours({
  pointId,
  townName,
  range,
  pollutant,
  onPollutant,
}: {
  pointId: string
  townName: string
  range: Range
  pollutant: PollutantInfo
  onPollutant: (key: Pollutant) => void
}) {
  const [filter, setFilter] = useState<DayFilter>("all")
  const [hovered, setHovered] = useState<number | null>(null)
  const earliest = addDays(minskToday(), -HOURLY_DAYS)
  const from = range.from < earliest ? earliest : range.from
  const hourly = useAirHourly(pointId, from, range.to)

  const profile = hourProfile(hourly.data ?? [], pollutant.key, pollutant.norm, filter)
  const extremes = profileExtremes(profile)
  const known = profile.filter((s) => s.mean !== null)
  const dayMean = known.length ? known.reduce((a, s) => a + s.mean!, 0) / known.length : null

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="font-heading text-xl font-semibold tracking-[-0.02em]">
          {text.title(townName, pollutant.label)}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label={text.pollutantLabel}
            options={pollutants.map((p) => ({ key: p.key, label: p.label }))}
            value={pollutant.key}
            onChange={(k) => onPollutant(k as Pollutant)}
          />
          <Segmented
            label={text.filterLabel}
            options={filters.map((f) => ({ key: f, label: text.filters[f] }))}
            value={filter}
            onChange={(k) => setFilter(k as DayFilter)}
          />
        </div>
      </div>
      {from > range.from && <p className="mt-2 text-[13px] text-muted-foreground">{text.capped}</p>}

      {hourly.isPending ? (
        <Skeleton className="mt-6 h-80 w-full rounded-xl" />
      ) : !known.length ? (
        <p className="mt-6 text-sm text-muted-foreground">{text.empty}</p>
      ) : (
        <div
          aria-busy={hourly.isPlaceholderData}
          className={cn(
            "mt-6 grid items-center gap-8 transition-opacity lg:grid-cols-[minmax(0,440px)_1fr] lg:gap-14",
            hourly.isPlaceholderData && "opacity-50",
          )}
        >
          <Clock
            key={`${pointId}-${pollutant.key}-${filter}-${from}-${range.to}`}
            profile={profile}
            norm={pollutant.norm}
            dayMean={dayMean}
            hovered={hovered}
            onHover={setHovered}
          />

          <div>
            {extremes && (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-b border-border pb-6">
                <Extreme
                  label={text.worst}
                  start={extremes.worst.start}
                  mean={extremes.worst.mean}
                  norm={pollutant.norm}
                />
                <Extreme
                  label={text.best}
                  start={extremes.best.start}
                  mean={extremes.best.mean}
                  norm={pollutant.norm}
                />
                {extremes.best.mean > 0 && (
                  <p className="col-span-2 text-[13px] text-muted-foreground">
                    {text.ratio(formatNumber(extremes.worst.mean / extremes.best.mean, 1))}
                  </p>
                )}
              </dl>
            )}

            <div className="mt-5 flex items-baseline justify-between gap-3 text-[13px]">
              <h4 className="font-medium">{text.partsTitle}</h4>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span aria-hidden="true" className="h-3 w-0.5 bg-foreground" />
                {text.normRing} {pollutant.norm}
              </span>
            </div>
            <ul className="mt-3 space-y-3">
              {text.parts.map((part) => {
                const stats = profile.slice(part.from, part.to).filter((s) => s.mean !== null)
                const mean = stats.length ? stats.reduce((a, s) => a + s.mean!, 0) / stats.length : null
                const top = Math.max(...known.map((s) => s.mean!), pollutant.norm)
                return (
                  <li
                    key={part.label}
                    className="grid grid-cols-[96px_1fr_92px] items-center gap-3 text-[13px]"
                    onPointerEnter={() => setHovered(null)}
                  >
                    <span className="whitespace-nowrap">
                      {part.label}{" "}
                      <span className="text-muted-foreground tabular-nums">
                        {part.from}–{part.to}
                      </span>
                    </span>
                    <span className="relative h-2 overflow-hidden rounded-full bg-muted">
                      {mean !== null && (
                        <span
                          className="hours-bar absolute inset-y-0 left-0 rounded-full"
                          style={{
                            width: `${(mean / top) * 100}%`,
                            background: levelColor[normLevel(mean, pollutant.norm)],
                          }}
                        />
                      )}
                      <span
                        aria-hidden="true"
                        className="absolute -inset-y-0.5 w-0.5 bg-foreground"
                        style={{ left: `${(pollutant.norm / top) * 100}%` }}
                      />
                    </span>
                    <span className="text-right font-medium tabular-nums">
                      {mean !== null ? `${formatNumber(mean, 1)} ${air.chart.unit}` : "—"}
                    </span>
                  </li>
                )
              })}
            </ul>
            <p className="mt-6 text-xs leading-[1.5] text-muted-foreground">{text.note}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function Extreme({ label, start, mean, norm }: { label: string; start: number; mean: number; norm: number }) {
  return (
    <div>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-heading text-[26px] leading-tight font-semibold tracking-[-0.02em] tabular-nums">
        {hourRange(start, start + 3)}
      </dd>
      <dd className="mt-0.5 inline-flex items-center gap-1.5 text-[13px] tabular-nums">
        <span
          aria-hidden="true"
          className="size-2 rounded-full"
          style={{ background: levelColor[normLevel(mean, norm)] }}
        />
        {formatNumber(mean, 1)} {air.chart.unit}
      </dd>
    </div>
  )
}

const SIZE = 440
const C = SIZE / 2
const R0 = 78
const R1 = 182

function Clock({
  profile,
  norm,
  dayMean,
  hovered,
  onHover,
}: {
  profile: readonly HourStat[]
  norm: number
  dayMean: number | null
  hovered: number | null
  onHover: (hour: number | null) => void
}) {
  const top = Math.max(...profile.map((s) => s.mean ?? 0))
  const normShown = norm <= top * 1.5
  const vmax = (normShown ? Math.max(norm * 1.15, top) : top) * 1.08
  const r = (v: number) => R0 + (v / vmax) * (R1 - R0)
  const nowHour = ((new Date().getUTCHours() + 3) % 24) + new Date().getUTCMinutes() / 60
  const focus = hovered !== null ? profile[hovered] : null

  return (
    <div className="mx-auto w-full max-w-[440px]">
      <div className="relative">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full" onPointerLeave={() => onHover(null)}>
          <circle cx={C} cy={C} r={R1} fill="none" stroke="var(--border)" />
          <circle cx={C} cy={C} r={R0} fill="none" stroke="var(--border)" />

          {profile.map((s) =>
            s.mean === null ? null : (
              <path
                key={s.hour}
                d={sector(s.hour, R0 + 1, Math.max(r(s.mean), R0 + 3))}
                fill={levelColor[normLevel(s.mean, norm)]}
                opacity={hovered === null || hovered === s.hour ? 0.95 : 0.35}
                className="hours-wedge cursor-default transition-opacity duration-150"
                style={{
                  animationDelay: `${s.hour * 35}ms`,
                  transformBox: "view-box",
                  transformOrigin: `${C}px ${C}px`,
                }}
                onPointerEnter={() => onHover(s.hour)}
              />
            ),
          )}

          {normShown && (
            <circle
              cx={C}
              cy={C}
              r={r(norm)}
              fill="none"
              stroke="var(--foreground)"
              strokeOpacity={0.55}
              strokeDasharray="4 4"
              className="river-fade pointer-events-none [animation-delay:900ms]"
            />
          )}

          {Array.from({ length: 8 }, (_, k) => k * 3).map((h) => {
            const a = angle(h)
            return (
              <text
                key={h}
                x={C + (R1 + 18) * Math.cos(a)}
                y={C + (R1 + 18) * Math.sin(a)}
                dy="0.35em"
                textAnchor="middle"
                className={cn(
                  "fill-muted-foreground text-[12px] tabular-nums",
                  h % 6 === 0 && "fill-foreground font-semibold",
                )}
              >
                {h}
              </text>
            )
          })}

          <g className="river-fade pointer-events-none [animation-delay:1000ms]">
            <line
              x1={C + (R0 - 6) * Math.cos(angle(nowHour))}
              y1={C + (R0 - 6) * Math.sin(angle(nowHour))}
              x2={C + (R1 + 6) * Math.cos(angle(nowHour))}
              y2={C + (R1 + 6) * Math.sin(angle(nowHour))}
              stroke="var(--foreground)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <circle
              cx={C + (R1 + 6) * Math.cos(angle(nowHour))}
              cy={C + (R1 + 6) * Math.sin(angle(nowHour))}
              r={3}
              fill="var(--foreground)"
            />
          </g>
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {focus && focus.mean !== null ? (
            <>
              <span className="text-[12px] text-muted-foreground tabular-nums">
                {hourRange(focus.hour, focus.hour + 1)}
              </span>
              <span className="font-heading text-[30px] leading-tight font-semibold tabular-nums">
                {formatNumber(focus.mean, 1)}
              </span>
              <span className="text-[11px] text-muted-foreground">{air.chart.unit}</span>
              <span className="mt-1 text-[11px] text-muted-foreground">
                {air.hours.centerOver(Math.round((focus.over / Math.max(focus.total, 1)) * 100))}
              </span>
            </>
          ) : (
            dayMean !== null && (
              <>
                <span className="font-heading text-[30px] leading-tight font-semibold tabular-nums">
                  {formatNumber(dayMean, 1)}
                </span>
                <span className="text-[11px] text-muted-foreground">{air.chart.unit}</span>
                <span className="mt-1 max-w-[110px] text-[11px] leading-tight text-muted-foreground">
                  {air.hours.centerDay}
                </span>
              </>
            )
          )}
        </div>
      </div>

      <p className="mt-2 flex justify-center gap-5 text-[12px] text-muted-foreground">
        {normShown ? (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="w-4 border-t border-dashed border-foreground/60" />
            {air.hours.normRing} {norm} {air.chart.unit}
          </span>
        ) : (
          <span>{air.hours.normFar(norm)}</span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-px w-4 bg-foreground" />
          {air.hours.now}
        </span>
      </p>
    </div>
  )
}

const angle = (hour: number) => (hour / 24) * Math.PI * 2 - Math.PI / 2

function sector(hour: number, r0: number, r1: number): string {
  const gap = 0.012
  const a0 = angle(hour) + gap
  const a1 = angle(hour + 1) - gap
  const p = (r: number, a: number) =>
    `${(C + r * Math.cos(a)).toFixed(2)},${(C + r * Math.sin(a)).toFixed(2)}`
  return `M${p(r0, a0)}L${p(r1, a0)}A${r1},${r1} 0 0 1 ${p(r1, a1)}L${p(r0, a1)}A${r0},${r0} 0 0 0 ${p(r0, a0)}Z`
}

function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: ReadonlyArray<{ key: string; label: string }>
  value: string
  onChange: (key: string) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-input p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "h-8 cursor-pointer rounded-[5px] px-2.5 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring",
            value === o.key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
