import { intlLocale } from "@/lib/locale"
import { useRef, type PointerEvent } from "react"
import { air, levelLabels, type PollutantInfo } from "@/content/air"
import { normLevel, type Range, type SeriesPoint, type TodayPoint } from "@/lib/airStats"
import { monotonePath, niceTicks } from "@/lib/chartPath"
import { formatNumber } from "@/lib/format"
import { useWidth } from "@/lib/useWidth"
import { formatDay, formatDayLong, levelColor } from "./format"

type Props = {
  series: readonly SeriesPoint[]
  pointId: string
  townName: string
  names: ReadonlyMap<string, string>
  pollutant: PollutantInfo
  hover: Range | null
  onHover: (range: Range | null) => void
  dataFrom: string | null
  today?: TodayPoint | null
}

const PAD = { top: 18, right: 12, bottom: 26, left: 40 }
const value1 = (v: number) => formatNumber(v, 1)
const halo = {
  stroke: "var(--background)",
  strokeWidth: 3,
  strokeLinejoin: "round",
  paintOrder: "stroke",
} as const

export default function AirChart({
  series,
  pointId,
  townName,
  names,
  pollutant,
  hover,
  onHover,
  dataFrom,
  today = null,
}: Props) {
  const box = useRef<HTMLDivElement>(null)
  const width = useWidth(box)
  const H = width && width < 640 ? 240 : 300
  const n = series.length
  const norm = pollutant.norm

  const values = series.map((s) => s.value)
  const slots = n + (today ? 1 : 0)
  const top =
    Math.max(
      norm * 1.3,
      ...series.map((s) => s.band?.[1] ?? 0),
      ...values.map((v) => v ?? 0),
      today?.value ?? 0,
      today?.band?.[1] ?? 0,
    ) * 1.05
  const ticks = niceTicks(0, top, 4)
  const hi = Math.max(top, ticks[ticks.length - 1] ?? top)
  const innerW = Math.max(width - PAD.left - PAD.right, 1)
  const plotH = H - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (slots <= 1 ? innerW / 2 : (i / (slots - 1)) * innerW)
  const step = innerW / Math.max(slots - 1, 1)
  const y = (v: number) => PAD.top + (1 - v / hi) * plotH
  const bottom = PAD.top + plotH

  const townSegments = segments(
    series.map((s, i) => (s.value == null ? null : ([x(i), y(s.value)] as const))),
  )
  const line = townSegments.map((seg) => monotonePath(seg)).join("")
  const area = townSegments
    .map((seg) => `${monotonePath(seg)}L${seg[seg.length - 1][0]},${bottom}L${seg[0][0]},${bottom}Z`)
    .join("")
  const band = segments(series.map((s, i) => (s.band ? ([i, s.band] as const) : null)))
    .map((seg) => {
      const upper = monotonePath(seg.map(([i, b]) => [x(i), y(b[1])] as const))
      const lower = monotonePath([...seg].reverse().map(([i, b]) => [x(i), y(b[0])] as const))
      return `${upper}L${lower.slice(1)}Z`
    })
    .join("")

  const known = values.flatMap((v, i) => (v == null ? [] : [{ v, i }]))
  const max = known.reduce<{ v: number; i: number } | null>((m, p) => (!m || p.v > m.v ? p : m), null)
  const lastI = known.length ? known[known.length - 1].i : -1

  const over = known.filter((p) => p.v > norm).length
  const withData = series.filter((s) => s.band).length
  const worstDays = series.filter((s) => s.maxPoint === pointId).length
  const bestDays = series.filter((s) => s.minPoint === pointId).length

  const fromI = hover ? series.findIndex((s) => s.day >= hover.from) : -1
  const toI = hover ? findLastIndex(series, (s) => s.day <= hover.to) : -1
  const single = hover && hover.from === hover.to && fromI >= 0 ? fromI : null
  const shown = single !== null ? series[single] : null
  const onToday = !!today && hover?.from === today.day && hover.to === today.day
  const xTicks = dateTicks(
    today ? [...series.map((s) => s.day), today.day] : series.map((s) => s.day),
    innerW,
  )
  const dot =
    shown && shown.value != null
      ? { i: single!, v: shown.value, today: false }
      : today && (onToday || !shown)
        ? { i: n, v: today.value, today: true }
        : lastI >= 0
          ? { i: lastI, v: values[lastI] ?? 0, today: false }
          : null

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!n) return
    const rect = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - rect.left - PAD.left) / innerW) * (slots - 1))
    const day = today && i >= n ? today.day : series[Math.min(n - 1, Math.max(0, i))].day
    if (!hover || hover.from !== day || hover.to !== day) onHover({ from: day, to: day })
  }

  const animKey = `${pointId}-${pollutant.key}-${series[0]?.day}-${n}`
  const zones = [
    { from: norm, to: 2 * norm, color: levelColor.elevated },
    { from: 2 * norm, to: hi, color: levelColor.high },
  ].filter((z) => z.from < hi)

  return (
    <figure>
      <p className="text-sm">{air.chart.rank(townName, worstDays, bestDays, withData)}</p>
      <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-0.5 w-5 rounded-full bg-foreground" />
          {pollutant.label} · {air.chart.town(townName)}
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-5 rounded-sm bg-foreground/10" />
          {air.chart.band}
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="w-5 border-t-2 border-dashed"
            style={{ borderColor: levelColor.elevated }}
          />
          {air.chart.norm} — {norm} {air.chart.unit}
        </span>
        {today && (
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="size-2.5 rounded-full border-2 border-foreground" />
            {air.chart.today}
          </span>
        )}
        {dataFrom && <span>{air.chart.dataFrom(formatDayLong(dataFrom))}</span>}
      </figcaption>

      <div
        ref={box}
        role="img"
        aria-label={`${pollutant.label}, ${townName}: ${air.daysOver(over, known.length)} ${air.daysOverCaption}`}
        className="relative mt-3 touch-pan-y select-none"
        style={{ height: H }}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={(e) => e.pointerType === "mouse" && onHover(null)}
      >
        {width > 0 && n > 0 && (
          <svg key={animKey} width={width} height={H} className="absolute inset-0 overflow-visible">
            <defs>
              <linearGradient id="air-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--foreground)" stopOpacity="0.14" />
                <stop offset="1" stopColor="var(--foreground)" stopOpacity="0" />
              </linearGradient>
              <clipPath id="air-ok">
                <rect x={0} y={y(norm)} width={width} height={H} />
              </clipPath>
              <clipPath id="air-elevated">
                <rect
                  x={0}
                  y={y(Math.min(2 * norm, hi))}
                  width={width}
                  height={Math.max(y(norm) - y(Math.min(2 * norm, hi)), 0)}
                />
              </clipPath>
              <clipPath id="air-high">
                <rect x={0} y={0} width={width} height={Math.max(y(2 * norm), 0)} />
              </clipPath>
            </defs>

            <g className="river-fade">
              {zones.map((z) => (
                <rect
                  key={z.from}
                  x={PAD.left}
                  width={innerW}
                  y={y(Math.min(z.to, hi))}
                  height={y(z.from) - y(Math.min(z.to, hi))}
                  fill={z.color}
                  opacity={0.08}
                />
              ))}
            </g>

            {ticks.map((v) => (
              <g key={v}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--border)" />
                <text
                  x={PAD.left - 8}
                  y={y(v)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-muted-foreground text-[11px] tabular-nums"
                >
                  {formatNumber(v)}
                </text>
              </g>
            ))}

            <path d={band} fill="var(--foreground)" opacity={0.08} className="river-fade" />

            {hover && single === null && fromI >= 0 && toI >= fromI && (
              <rect
                x={x(fromI) - step / 2}
                width={x(toI) - x(fromI) + step}
                y={PAD.top - 6}
                height={plotH + 6}
                fill="var(--foreground)"
                opacity={0.07}
                rx={3}
              />
            )}

            <path d={area} fill="url(#air-fill)" className="river-rise" />

            <g className="river-fade [animation-delay:500ms]">
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(norm)}
                y2={y(norm)}
                stroke={levelColor.elevated}
                strokeWidth={1.5}
                strokeDasharray="5 4"
              />
              <text
                x={PAD.left + 6}
                y={y(norm) - 5}
                className="text-[11px] font-medium"
                {...halo}
                fill={levelColor.elevated}
              >
                {air.chart.normShort(norm)}
              </text>
              {2 * norm < hi && (
                <>
                  <line
                    x1={PAD.left}
                    x2={width - PAD.right}
                    y1={y(2 * norm)}
                    y2={y(2 * norm)}
                    stroke={levelColor.high}
                    strokeOpacity={0.6}
                    strokeDasharray="2 4"
                  />
                  <text
                    x={PAD.left + 6}
                    y={y(2 * norm) - 5}
                    className="text-[11px] font-medium"
                    {...halo}
                    fill={levelColor.high}
                  >
                    {air.chart.twoNorms}
                  </text>
                </>
              )}
            </g>

            {(["ok", "elevated", "high"] as const).map((level) => (
              <path
                key={level}
                d={line}
                fill="none"
                stroke={level === "ok" ? "var(--foreground)" : levelColor[level]}
                strokeWidth={2.25}
                strokeLinejoin="round"
                strokeLinecap="round"
                clipPath={`url(#air-${level})`}
                pathLength={1}
                strokeDasharray="1"
                className="river-draw"
              />
            ))}

            {max && max.i !== lastI && single === null && (
              <g className="river-fade [animation-delay:1100ms]">
                <circle cx={x(max.i)} cy={y(max.v)} r={3} fill={levelColor[normLevel(max.v, norm)]} />
                <text
                  x={Math.min(Math.max(x(max.i), PAD.left + 70), width - PAD.right - 70)}
                  y={y(max.v) - 9}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[11px] tabular-nums"
                  {...halo}
                >
                  {air.chart.max(value1(max.v), formatDay(series[max.i].day))}
                </text>
              </g>
            )}

            {today && lastI === n - 1 && (
              <line
                x1={x(lastI)}
                y1={y(values[lastI] ?? 0)}
                x2={x(n)}
                y2={y(today.value)}
                stroke={
                  normLevel(today.value, norm) === "ok"
                    ? "var(--foreground)"
                    : levelColor[normLevel(today.value, norm)]
                }
                strokeOpacity={0.7}
                strokeWidth={2}
                strokeDasharray="2 4"
                strokeLinecap="round"
                className="river-fade [animation-delay:1300ms]"
              />
            )}

            {(single !== null || onToday) && (
              <line
                x1={x(onToday ? n : single!)}
                x2={x(onToday ? n : single!)}
                y1={PAD.top - 6}
                y2={bottom}
                stroke="var(--foreground)"
                strokeOpacity={0.25}
              />
            )}

            {xTicks.map((t) => (
              <text
                key={t.i}
                x={x(t.i)}
                y={H - 6}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px] tabular-nums"
              >
                {t.label}
              </text>
            ))}
          </svg>
        )}

        {width > 0 && dot && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute z-10 size-2.5 -translate-1/2 transition-[left,top] duration-150 ease-out"
            style={{ left: x(dot.i), top: y(dot.v) }}
          >
            {!shown && !onToday && (
              <span
                className="river-ping absolute inset-0 rounded-full"
                style={{ background: levelColor[normLevel(dot.v, norm)] }}
              />
            )}
            <span
              className="absolute inset-0 rounded-full ring-2 ring-background"
              style={
                dot.today
                  ? {
                      background: "var(--background)",
                      boxShadow: `inset 0 0 0 2px ${levelColor[normLevel(dot.v, norm)]}`,
                    }
                  : { background: levelColor[normLevel(dot.v, norm)] }
              }
            />
          </span>
        )}

        {today && onToday && (
          <Tip
            point={today}
            hours={today.hours}
            left={Math.min(Math.max(x(n), PAD.left + 130), width - 130)}
            top={y(today.value) - 14}
            townName={townName}
            names={names}
            norm={norm}
          />
        )}

        {shown && single !== null && (
          <Tip
            point={shown}
            left={Math.min(Math.max(x(single), PAD.left + 110), width - 110)}
            top={y(shown.value ?? shown.band?.[1] ?? 0) - 14}
            townName={townName}
            names={names}
            norm={norm}
          />
        )}
      </div>
    </figure>
  )
}

function Tip({
  point,
  hours,
  left,
  top,
  townName,
  names,
  norm,
}: {
  point: SeriesPoint
  hours?: number
  left: number
  top: number
  townName: string
  names: ReadonlyMap<string, string>
  norm: number
}) {
  const level = point.value != null ? normLevel(point.value, norm) : null
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-20 w-max max-w-[260px] -translate-x-1/2 -translate-y-full rounded-md bg-foreground px-2.5 py-1.5 text-[12px] leading-snug text-background shadow-lg transition-[left,top] duration-150 ease-out"
      style={{ left, top }}
    >
      <div>
        {hours != null ? air.chart.todayTip(hours) : formatDayLong(point.day)}
        {point.value != null && (
          <>
            {" · "}
            <span className="font-semibold tabular-nums">
              {value1(point.value)} {air.chart.unit}
            </span>
          </>
        )}
      </div>
      <div className="opacity-75">
        {point.value == null
          ? air.chart.noData(townName)
          : level === "ok"
            ? levelLabels.ok
            : air.aboveNorm(point.value, norm)}
      </div>
      {hours != null && <div className="mt-0.5 opacity-60">{air.chart.todayNote}</div>}
      {point.band && point.minPoint && point.maxPoint && (
        <div className="mt-0.5 opacity-60">
          {air.chart.range(
            value1(point.band[0]),
            names.get(point.minPoint) ?? "",
            value1(point.band[1]),
            names.get(point.maxPoint) ?? "",
          )}
        </div>
      )}
    </div>
  )
}

function segments<T>(items: ReadonlyArray<T | null>): T[][] {
  const out: T[][] = []
  let current: T[] = []
  for (const item of items) {
    if (item === null) {
      if (current.length) out.push(current)
      current = []
    } else current.push(item)
  }
  if (current.length) out.push(current)
  return out
}

function findLastIndex<T>(items: readonly T[], pred: (item: T) => boolean): number {
  for (let i = items.length - 1; i >= 0; i--) if (pred(items[i])) return i
  return -1
}

const monthFormat = new Intl.DateTimeFormat(intlLocale, { month: "short", timeZone: "UTC" })

function dateTicks(days: readonly string[], width: number): Array<{ i: number; label: string }> {
  if (!days.length) return []
  const room = Math.max(2, Math.floor(width / 70))
  if (days.length > 92) {
    const starts = days.flatMap((d, i) => (d.endsWith("-01") ? [i] : []))
    const step = Math.ceil(starts.length / room)
    return starts
      .filter((_, k) => k % step === 0)
      .map((i) => ({ i, label: monthFormat.format(new Date(`${days[i]}T00:00:00Z`)) }))
  }
  const step = Math.max(1, Math.ceil(days.length / room))
  const out: Array<{ i: number; label: string }> = []
  for (let i = 0; i < days.length; i += step) out.push({ i, label: formatDay(days[i]) })
  return out
}
