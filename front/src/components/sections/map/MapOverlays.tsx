import { ArrowRight, Droplets } from "lucide-react"
import { useState, type KeyboardEvent, type PointerEvent } from "react"
import { Link } from "react-router"
import type { AirReading } from "@/api/air"
import { ReportIcon } from "@/components/map/ReportIcon"
import { RiverTriangle } from "@/components/map/RiverTriangle"
import type { MapTown } from "@/components/map/types"
import { air, pollutants } from "@/content/air"
import { map as text } from "@/content/map"
import { AQI_SCALE, aqiCategory } from "@/lib/aqi"
import { normLevel } from "@/lib/airStats"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { formatDay, formatDayLong, levelColor } from "../air/format"
import { CountUp } from "@/components/CountUp"
import { Tooltip } from "@/components/ui/tooltip"

// No backdrop-blur: panels sit over the map canvas, and the blur would be recomputed on every map frame.
const panel = "rounded-xl border border-border bg-background/95 p-5"
const SCALE_MAX = 200
const scaleSegments = AQI_SCALE.filter((c) => c.min < SCALE_MAX)

export function AirOverview({
  towns,
  selectedId,
  onSelect,
  reportsOpen,
  reportsResolved,
  className,
  intro = true,
}: {
  towns: readonly MapTown[]
  selectedId: string | null
  onSelect: (id: string) => void
  reportsOpen: number
  reportsResolved: number
  className?: string
  intro?: boolean
}) {
  const withData = towns.filter((t) => t.aqi != null)
  const good = withData.filter((t) => aqiCategory(t.aqi)?.level === "good").length
  const sorted = [...withData].sort((a, b) => b.aqi! - a.aqi!)
  const worst = sorted[0]
  const best = sorted[sorted.length - 1]

  const townLink = (t: MapTown) => (
    <button
      type="button"
      onClick={() => onSelect(t.id)}
      className="cursor-pointer text-left underline decoration-border underline-offset-4 hover:decoration-foreground"
    >
      {t.name}
    </button>
  )

  return (
    <section aria-label={text.overview.title} className={cn(panel, className)}>
      <p className="text-[13px] text-muted-foreground">{text.overview.title}</p>
      {withData.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{text.card.noData}</p>
      ) : (
        <>
          <p className="mt-2 font-heading text-[44px] leading-none font-semibold tracking-[-0.04em] tabular-nums">
            <CountUp value={good} play={intro} delay={0.15} /> {text.overview.of(withData.length)}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">{text.overview.goodCaption}</p>

          <div className="relative mt-5">
            <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
              {scaleSegments.map((c) => (
                <span key={c.level} className="flex-1" style={{ background: c.color }} />
              ))}
            </div>
            {withData.map((t, i) => (
              <Tooltip
                key={t.id}
                content={`${t.name}: AQI ${Math.round(t.aqi!)}`}
                side="top"
                delayDuration={0}
              >
                <span
                  className={cn(
                    "absolute top-1/2 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
                    t.id === selectedId ? "z-10 h-5 bg-focus" : "h-3 bg-foreground/80",
                  )}
                  style={{
                    left: intro ? `${(Math.min(t.aqi!, SCALE_MAX) / SCALE_MAX) * 100}%` : "0%",
                    transition: "left 1100ms cubic-bezier(0.16, 1, 0.3, 1)",
                    transitionDelay: `${250 + i * 25}ms`,
                  }}
                />
              </Tooltip>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground tabular-nums">
            {[0, 50, 100, 150, 200].map((v) => (
              <span key={v}>{v}</span>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{text.overview.scaleCaption}</p>

          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-border pt-4 text-sm">
            {worst && (
              <div>
                <dt className="text-[12px] text-muted-foreground">{text.overview.worst}</dt>
                <dd className="mt-0.5 font-medium">
                  {townLink(worst)}{" "}
                  <span className="tabular-nums" style={{ color: aqiCategory(worst.aqi)?.color }}>
                    {Math.round(worst.aqi!)}
                  </span>
                </dd>
              </div>
            )}
            {best && best !== worst && (
              <div>
                <dt className="text-[12px] text-muted-foreground">{text.overview.best}</dt>
                <dd className="mt-0.5 font-medium">
                  {townLink(best)}{" "}
                  <span className="tabular-nums" style={{ color: aqiCategory(best.aqi)?.color }}>
                    {Math.round(best.aqi!)}
                  </span>
                </dd>
              </div>
            )}
          </dl>

          <p className="mt-4 text-[12px] text-muted-foreground">{text.overview.reports}</p>
          <dl className="mt-1 grid grid-cols-2 gap-x-4">
            <div className="flex flex-row-reverse items-baseline justify-end gap-2">
              <dt className="text-[12px] text-muted-foreground">{text.overview.reportsOpen}</dt>
              <dd className="font-heading text-2xl font-semibold tabular-nums">{reportsOpen}</dd>
            </div>
            <div className="flex flex-row-reverse items-baseline justify-end gap-2">
              <dt className="text-[12px] text-muted-foreground">{text.overview.reportsResolved}</dt>
              <dd className="font-heading text-2xl font-semibold text-success tabular-nums">
                {reportsResolved}
              </dd>
            </div>
          </dl>
        </>
      )}
    </section>
  )
}

export function TownCard({
  town,
  districtName,
  reading,
  days,
  className,
}: {
  town: MapTown
  districtName: string | undefined
  reading: AirReading | undefined
  days: ReadonlyArray<{ day: string; value: number | null }>
  className?: string
}) {
  const category = aqiCategory(reading?.us_aqi)
  const pm25 = pollutants.find((p) => p.key === "pm2_5")!
  const known = days.filter((d): d is { day: string; value: number } => d.value != null)
  const over = known.filter((d) => d.value > pm25.norm).length
  const worst = known.reduce<(typeof known)[number] | null>((w, d) => (!w || d.value > w.value ? d : w), null)
  const district = districtName && !districtName.startsWith("г.") ? text.card.district(districtName) : null

  return (
    <section
      aria-label={town.name}
      className={cn("light rounded-xl bg-background p-5 text-foreground shadow-lg", className)}
    >
      {category ? (
        <p
          className="inline-flex items-center gap-1.5 text-[13px] font-medium"
          style={{ color: category.color }}
        >
          <span aria-hidden="true" className="size-2 rounded-full" style={{ background: category.color }} />
          <span className="first-letter:uppercase">{category.label}</span> воздух
        </p>
      ) : (
        <p className="text-[13px] text-muted-foreground">{text.card.noData}</p>
      )}

      <div className="mt-3 flex items-center gap-3.5">
        {category && reading && (
          <div
            data-aqi-surface={category.level}
            className="grid size-16 shrink-0 place-content-center rounded-lg bg-(--surface) text-center text-(--ink) transition-colors duration-300 motion-reduce:transition-none"
          >
            <span className="font-heading text-[26px] leading-none font-semibold tabular-nums">
              {Math.round(reading.us_aqi ?? 0)}
            </span>
            <span className="mt-1 text-[10px] leading-none font-medium tracking-wide">AQI</span>
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-heading text-[28px] leading-tight font-semibold tracking-[-0.03em]">
            {town.name}
          </h3>
          {district && <p className="text-[13px] text-muted-foreground">{district}</p>}
        </div>
      </div>

      {reading && (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3 text-[12px] text-muted-foreground">
            <p>{text.card.now}</p>
            <p className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-0.5 rounded-full bg-foreground" />
              {text.card.normMark}
            </p>
          </div>
          <dl className="mt-1.5 grid grid-cols-4 gap-1.5">
            {pollutants.map((p, i) => (
              <PollutantTile
                key={p.key}
                label={p.label}
                hint={p.hint}
                norm={p.norm}
                value={reading[p.key] ?? 0}
                align={i === 0 ? "start" : i === pollutants.length - 1 ? "end" : "center"}
              />
            ))}
          </dl>
        </div>
      )}

      {known.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-[12px] text-muted-foreground">{text.card.daysTitle}</p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span
              className="font-heading text-[26px] leading-none font-semibold tabular-nums"
              style={{ color: over ? levelColor.high : levelColor.ok }}
            >
              {over}
            </span>
            <span className="text-[15px] font-medium tabular-nums">{text.card.daysOf(known.length)}</span>
          </p>

          <DayStrip days={days} norm={pm25.norm} worstDay={worst?.day ?? null} />
        </div>
      )}

      <Link
        to={{ search: `?town=${encodeURIComponent(town.name)}`, hash: "#air" }}
        className="mt-5 flex items-center justify-between border-t border-border pt-4 text-[13px] font-medium text-link hover:text-link-hover"
      >
        {text.card.more}
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </section>
  )
}

function PollutantTile({
  label,
  hint,
  norm,
  value,
  align,
}: {
  label: string
  hint: string
  norm: number
  value: number
  align: "start" | "center" | "end"
}) {
  const level = normLevel(value, norm)
  const formatted = formatNumber(value, 1)
  const details = text.card.nowVsNorm(formatted, norm)

  return (
    <div
      tabIndex={0}
      className="group relative rounded-md bg-muted px-2.5 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <dt className="text-[11px] leading-none text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 font-heading text-[17px] leading-none font-semibold tabular-nums">{formatted}</dd>
      <dd aria-hidden="true" className="relative mt-2.5 h-1.5 rounded-full bg-foreground/10">
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `max(4px, ${Math.min(1, value / (2 * norm)) * 100}%)`,
            background: levelColor[level],
          }}
        />
        <span className="absolute -inset-y-[3px] left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-foreground" />
      </dd>
      <dd className="sr-only">
        {hint}; {details}
      </dd>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-full z-10 mb-2.5 translate-y-1 opacity-0 transition-[opacity,translate] duration-150 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus:translate-y-0 group-focus:opacity-100 motion-reduce:transition-none"
      >
        <div
          className={cn(
            "absolute bottom-0 w-[244px] rounded-md bg-foreground px-2.5 py-1.5 text-[12px] leading-snug text-background shadow-lg",
            align === "start" && "left-0",
            align === "center" && "left-1/2 -translate-x-1/2 text-center",
            align === "end" && "right-0 text-right",
          )}
        >
          <div className="font-medium">
            {label} — {hint}
          </div>
          <div className="whitespace-nowrap opacity-75">{details}</div>
        </div>
        <span className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-foreground" />
      </div>
    </div>
  )
}

const TIP_W = 184
const TIP_OVERHANG = 12

function DayStrip({
  days,
  norm,
  worstDay,
}: {
  days: ReadonlyArray<{ day: string; value: number | null }>
  norm: number
  worstDay: string | null
}) {
  const worstIndex = Math.max(
    0,
    days.findIndex((d) => d.day === worstDay),
  )
  const [tip, setTip] = useState({ index: worstIndex, open: false })
  const show = (index: number) => setTip({ index: Math.min(days.length - 1, Math.max(0, index)), open: true })
  const hide = () => setTip((t) => ({ ...t, open: false }))

  const shown = days[tip.index]
  const worst = days[worstIndex]
  const verdict = (value: number) =>
    normLevel(value, norm) === "ok" ? text.card.withinNorm : air.aboveNorm(value, norm)
  const valueText = (d: (typeof days)[number]) =>
    d.value == null
      ? text.card.noDayData
      : `${formatNumber(d.value, 1)} ${air.chart.unit}, ${verdict(d.value)}`
  const center = ((tip.index + 0.5) / days.length) * 100

  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    show(Math.floor(((e.clientX - rect.left) / rect.width) * days.length))
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") return hide()
    const from = tip.open ? tip.index : worstIndex
    const last = days.length - 1
    const keys: Record<string, number> = {
      ArrowLeft: from - 1,
      ArrowDown: from - 1,
      ArrowRight: from + 1,
      ArrowUp: from + 1,
      Home: 0,
      End: last,
    }
    if (!(e.key in keys)) return
    e.preventDefault()
    show(keys[e.key])
  }

  const glide = "transition-[left] duration-200 ease-out motion-reduce:transition-none"

  return (
    <>
      <div className="relative mt-3">
        {/* Tip and arrow fade as one wrapper, so no dark diamond shows where they overlap. */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-full z-10 mb-3 transition-[opacity,translate] duration-150 ease-out motion-reduce:transition-none",
            tip.open ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
          )}
        >
          <div
            className={cn(
              "absolute bottom-0 rounded-md bg-foreground px-2.5 py-1.5 text-center text-[12px] leading-snug text-background shadow-lg",
              glide,
            )}
            style={{
              width: TIP_W,
              left: `clamp(-${TIP_OVERHANG}px, calc(${center}% - ${TIP_W / 2}px), calc(100% - ${TIP_W - TIP_OVERHANG}px))`,
            }}
          >
            <div className="whitespace-nowrap">
              {formatDayLong(shown.day)} ·{" "}
              <span className="font-semibold tabular-nums">
                {shown.value == null
                  ? text.card.noDayData
                  : `${formatNumber(shown.value, 1)} ${air.chart.unit}`}
              </span>
            </div>
            {shown.value != null && <div className="opacity-75">{verdict(shown.value)}</div>}
          </div>
          <span
            className={cn("absolute -bottom-1 size-2 -translate-x-1/2 rotate-45 bg-foreground", glide)}
            style={{ left: `${center}%` }}
          />
        </div>

        <div
          role="slider"
          tabIndex={0}
          aria-label={text.card.stripLabel}
          aria-valuemin={1}
          aria-valuemax={days.length}
          aria-valuenow={(tip.open ? tip.index : worstIndex) + 1}
          aria-valuetext={(() => {
            const d = days[tip.open ? tip.index : worstIndex]
            return `${formatDayLong(d.day)}: ${valueText(d)}`
          })()}
          onPointerDown={fromPointer}
          onPointerMove={fromPointer}
          onPointerLeave={(e) => e.pointerType === "mouse" && hide()}
          onFocus={() => setTip((t) => (t.open ? t : { index: worstIndex, open: true }))}
          onBlur={hide}
          onKeyDown={onKeyDown}
          className="flex h-8 cursor-pointer touch-pan-y items-end gap-[2px] rounded-[3px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        >
          {days.map((d, i) => {
            const level = d.value == null ? null : normLevel(d.value, norm)
            const current = tip.open && i === tip.index
            return (
              <span
                key={d.day}
                className={cn(
                  "flex-1 rounded-[2px] transition-[height,opacity] duration-150 ease-out motion-reduce:transition-none",
                  level === null && "bg-muted",
                  current ? "h-8" : "h-6",
                  tip.open && !current && "opacity-50",
                )}
                style={
                  level
                    ? {
                        background:
                          level === "ok"
                            ? `color-mix(in oklab, ${levelColor.ok} 35%, transparent)`
                            : levelColor[level],
                      }
                    : undefined
                }
              />
            )
          })}
        </div>
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>{formatDay(days[0].day)}</span>
        <span>{formatDay(days[days.length - 1].day)}</span>
      </div>

      {worst?.value != null && (
        <dl
          className="mt-3 grid cursor-default grid-cols-[1fr_auto] gap-x-3 text-[13px] leading-snug"
          onPointerEnter={() => show(worstIndex)}
          onPointerLeave={hide}
        >
          <dt className="text-muted-foreground">{text.card.worstDay}</dt>
          <dd className="text-right font-medium tabular-nums">
            {formatNumber(worst.value, 1)} {air.chart.unit}
          </dd>
          <dd>{formatDayLong(worst.day)}</dd>
          <dd className="text-right text-muted-foreground">{verdict(worst.value)}</dd>
        </dl>
      )}
    </>
  )
}

export function MapLegend({ className }: { className?: string }) {
  return (
    <section aria-label="Легенда" className={cn(panel, "text-[13px]", className)}>
      <ul className="grid gap-y-1.5">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="flex -space-x-1">
            {scaleSegments.map((c) => (
              <span
                key={c.level}
                className="size-3 rounded-full ring-2 ring-background"
                style={{ background: c.color }}
              />
            ))}
          </span>
          {text.legend.town}
        </li>
        <li className="flex items-center gap-2">
          <span className="grid size-5 place-items-center rounded-full border border-foreground/80">
            <ReportIcon category="dump" className="size-3" />
          </span>
          {text.legend.report}
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="flex w-5 items-center justify-center gap-px">
            <RiverTriangle trend="up" status="low" className="size-2.5" />
            <RiverTriangle trend="down" status="normal" className="size-2.5" />
          </span>
          {text.legend.level}
        </li>
        <li className="flex items-center gap-2">
          <span className="grid size-5 place-items-center rounded-full border-2 border-level-elevated text-map-river-label">
            <Droplets aria-hidden="true" className="size-3" />
          </span>
          {text.legend.water}
        </li>
      </ul>
    </section>
  )
}
