import { ArrowLeftRight, LocateFixed } from "lucide-react"
import { useState, type ReactNode } from "react"
import { Link } from "react-router"
import { riverColor } from "@/components/map/riverColor"
import { formatDay } from "@/components/sections/air/format"
import { air, pollutants } from "@/content/air"
import { compare, districtLabel } from "@/content/compare"
import { indicators, water as waterText } from "@/content/water"
import { aqiCategory } from "@/lib/aqi"
import type { Pollutant, PointSummary } from "@/lib/airStats"
import type { ReportCounts } from "@/lib/compare"
import { formatNumber } from "@/lib/format"
import type { PostSummary } from "@/lib/rivers"
import { cn } from "@/lib/utils"
import type { Section } from "@/lib/water"

const text = compare.pair

export type PairSide = {
  id: string
  name: string
  aqi: number | null
  air: ReadonlyMap<Pollutant, PointSummary>
  rivers: readonly PostSummary[]
  water: readonly Section[]
  reports: ReportCounts
}

type Props = {
  a: PairSide
  b: PairSide
  districts: readonly { id: string; name: string }[]
  onA: (id: string) => void
  onB: (id: string) => void
  onSwap: () => void
  /** Район по координатам или null — вне области */
  locate: (lon: number, lat: number) => string | null
  periodShort: string
  riversAsOf: string | null
  waterQuarter: string | null
}

const control =
  "h-9 rounded-md border border-input bg-background px-3 text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

/**
 * Два района бок о бок по всему, что есть на сайте: воздух за период и сейчас, посты на реках, участки рек из
 * квартального обзора, обращения. Числа — зеркальными барами от центра, первый район слева, второй справа.
 */
export function DistrictPair({
  a,
  b,
  districts,
  onA,
  onB,
  onSwap,
  locate,
  periodShort,
  riversAsOf,
  waterQuarter,
}: Props) {
  const sorted = [...districts].sort((x, y) =>
    districtLabel(x.name).localeCompare(districtLabel(y.name), "ru"),
  )
  const reportsNone = a.reports.total === 0 && b.reports.total === 0

  return (
    <div>
      {/* Названия районов остаются на экране, пока листаются группы */}
      <div className="sticky top-(--header-h) z-10 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:-mx-10 md:px-10">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 sm:gap-4">
          <Picker
            id="pair-a"
            label={text.first}
            color="var(--compare-a)"
            value={a.id}
            options={sorted.filter((d) => d.id !== b.id)}
            onChange={onA}
            align="end"
          >
            <NearMe locate={locate} onFound={onA} />
          </Picker>
          <button
            type="button"
            onClick={onSwap}
            aria-label={text.swap}
            title={text.swap}
            className={cn(control, "inline-flex cursor-pointer items-center justify-center px-2.5")}
          >
            <ArrowLeftRight aria-hidden="true" className="size-4" />
          </button>
          <Picker
            id="pair-b"
            label={text.second}
            color="var(--compare-b)"
            value={b.id}
            options={sorted.filter((d) => d.id !== a.id)}
            onChange={onB}
          />
        </div>
      </div>

      <Group title={text.air.title} meta={periodShort}>
        <Mirror label={text.air.aqiNow} a={<AqiValue value={a.aqi} />} b={<AqiValue value={b.aqi} />} />
        {pollutants.map((p) => {
          const sa = a.air.get(p.key)
          const sb = b.air.get(p.key)
          return (
            <Mirror
              key={p.key}
              label={text.air.daysOver(p.label, p.norm)}
              a={<Days summary={sa} unit={air.chart.unit} />}
              b={<Days summary={sb} unit={air.chart.unit} />}
              shareA={sa && sa.daysTotal ? sa.daysOver / sa.daysTotal : null}
              shareB={sb && sb.daysTotal ? sb.daysOver / sb.daysTotal : null}
            />
          )
        })}
      </Group>

      <Group
        title={text.rivers.title}
        meta={riversAsOf ? text.rivers.asOf(riversAsOf) : null}
        footer={
          <Link to="/#water" className="font-medium text-link hover:text-link-hover">
            {text.rivers.more}
          </Link>
        }
      >
        <Columns a={<Posts posts={a.rivers} />} b={<Posts posts={b.rivers} />} />
      </Group>

      <Group title={text.water.title} meta={waterQuarter}>
        <Columns a={<WaterSections sections={a.water} />} b={<WaterSections sections={b.water} />} />
      </Group>

      <Group title={text.reports.title} meta={periodShort}>
        {reportsNone ? (
          <p className="py-3 text-center text-sm text-muted-foreground">
            {text.reports.none}{" "}
            <Link to="/reports/new" className="font-medium text-link hover:text-link-hover">
              {text.reports.cta}
            </Link>
          </p>
        ) : (
          (["total", "open", "resolved"] as const).map((key) => (
            <Mirror
              key={key}
              label={text.reports[key]}
              a={<Big>{a.reports[key]}</Big>}
              b={<Big>{b.reports[key]}</Big>}
            />
          ))
        )}
      </Group>
    </div>
  )
}

function Picker({
  id,
  label,
  color,
  value,
  options,
  onChange,
  align = "start",
  children,
}: {
  id: string
  label: string
  color: string
  value: string
  options: readonly { id: string; name: string }[]
  onChange: (id: string) => void
  align?: "start" | "end"
  children?: ReactNode
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", align === "end" && "sm:items-end")}>
      <label htmlFor={id} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ background: color }} />
        {label}
      </label>
      <div className={cn("flex min-w-0 flex-wrap items-center gap-2", align === "end" && "sm:justify-end")}>
        {align === "end" && children}
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(control, "w-full min-w-0 pr-8 font-semibold sm:w-auto sm:max-w-[260px]")}
        >
          {options.map((d) => (
            <option key={d.id} value={d.id}>
              {districtLabel(d.name)}
            </option>
          ))}
        </select>
        {align === "start" && children}
      </div>
    </div>
  )
}

/** «Мой район»: точка из геолокации — в полигон района; координаты остаются в браузере */
function NearMe({ locate, onFound }: { locate: Props["locate"]; onFound: (id: string) => void }) {
  const [state, setState] = useState<"idle" | "busy" | "error" | "outside">("idle")
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return null

  const run = () => {
    setState("busy")
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const id = locate(coords.longitude, coords.latitude)
        if (id) {
          setState("idle")
          onFound(id)
        } else setState("outside")
      },
      () => setState("error"),
      { maximumAge: 10 * 60_000, timeout: 10_000 },
    )
  }

  const message = state === "error" ? text.nearMeError : state === "outside" ? text.outside : null
  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={state === "busy"}
        title={message ?? undefined}
        className={cn(
          control,
          "hidden cursor-pointer items-center gap-1.5 disabled:opacity-60 sm:inline-flex",
        )}
      >
        <LocateFixed aria-hidden="true" className="size-4" />
        {text.nearMe}
      </button>
      {message && (
        <span role="status" className="hidden text-xs text-muted-foreground sm:inline">
          {message}
        </span>
      )}
    </>
  )
}

function Group({
  title,
  meta,
  footer,
  children,
}: {
  title: string
  meta?: string | null
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-3">
        <h3 className="font-heading text-xl font-semibold tracking-[-0.02em]">{title}</h3>
        {meta && <p className="text-[13px] text-muted-foreground">{meta}</p>}
      </div>
      <div className="divide-y divide-border">{children}</div>
      {footer && <p className="mt-3 text-[13px]">{footer}</p>}
    </section>
  )
}

/** Строка «первый | второй»: подпись по центру, значения у краёв, бары растут от центра наружу */
function Mirror({
  label,
  a,
  b,
  shareA,
  shareB,
}: {
  label: string
  a: ReactNode
  b: ReactNode
  shareA?: number | null
  shareB?: number | null
}) {
  const bars = shareA !== undefined || shareB !== undefined
  return (
    <div className="py-4">
      <p className="text-center text-[13px] text-muted-foreground">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-x-3 sm:gap-x-6">
        <div className={cn("grid items-center gap-x-3 sm:gap-x-4", bars && "grid-cols-[auto_minmax(0,1fr)]")}>
          <div>{a}</div>
          {bars && <Bar share={shareA ?? null} color="var(--compare-a)" side="left" />}
        </div>
        <div className={cn("grid items-center gap-x-3 sm:gap-x-4", bars && "grid-cols-[minmax(0,1fr)_auto]")}>
          {bars && <Bar share={shareB ?? null} color="var(--compare-b)" side="right" />}
          <div className="text-right">{b}</div>
        </div>
      </div>
    </div>
  )
}

/** Дорожка — весь период, полоса — доля дней выше нормы; у центральной линии бары первого и второго встречаются */
function Bar({ share, color, side }: { share: number | null; color: string; side: "left" | "right" }) {
  return (
    <span
      aria-hidden="true"
      className={cn("flex h-2 overflow-hidden rounded-[2px] bg-muted", side === "left" && "justify-end")}
    >
      {share != null && (
        <span
          className="block h-full rounded-[2px] transition-[width] duration-300"
          style={{ width: `${Math.min(1, share) * 100}%`, background: color }}
        />
      )}
    </span>
  )
}

function Big({ children }: { children: ReactNode }) {
  return (
    <span className="font-heading text-[26px] leading-none font-semibold tracking-[-0.03em] tabular-nums sm:text-[32px]">
      {children}
    </span>
  )
}

function Days({ summary, unit }: { summary: PointSummary | undefined; unit: string }) {
  if (!summary) return <span className="text-sm text-muted-foreground">—</span>
  return (
    <span className="inline-flex flex-col">
      <span className="whitespace-nowrap">
        <Big>{summary.daysOver}</Big>{" "}
        <span className="text-[13px] text-muted-foreground tabular-nums">
          {text.air.of(summary.daysTotal)}
        </span>
      </span>
      {summary.worst && (
        <span className="mt-1 hidden text-xs text-muted-foreground tabular-nums sm:block">
          {text.air.worst(formatDay(summary.worst.day), `${formatNumber(summary.worst.value, 1)} ${unit}`)}
        </span>
      )}
    </span>
  )
}

function AqiValue({ value }: { value: number | null }) {
  const category = aqiCategory(value)
  if (value == null || !category) return <span className="text-sm text-muted-foreground">—</span>
  return (
    <span className="inline-flex flex-col">
      <Big>{Math.round(value)}</Big>
      <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span aria-hidden="true" className="size-2 rounded-full" style={{ background: category.color }} />
        {category.label}
      </span>
    </span>
  )
}

/** Две колонки списков: первый район слева, второй справа */
function Columns({ a, b }: { a: ReactNode; b: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 py-4 sm:gap-x-6">
      <div className="min-w-0">{a}</div>
      <div className="min-w-0">{b}</div>
    </div>
  )
}

function Posts({ posts }: { posts: readonly PostSummary[] }) {
  if (!posts.length) return <p className="text-sm text-muted-foreground">{text.rivers.none}</p>
  return (
    <ul className="space-y-3">
      {posts.map((p) => (
        <li key={p.post.id} className="text-sm leading-snug">
          <span className="font-medium">
            {p.post.river} — {p.post.name}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ background: riverColor[p.status] }}
            />
            <span>
              {waterText.levels.status[p.status]} · {p.latest.level} {waterText.levels.unit}
            </span>
          </span>
          {p.daysLow != null && (
            <span className="block text-xs text-muted-foreground tabular-nums">
              {waterText.levels.daysLow(p.daysLow, p.series.length)}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

function WaterSections({ sections }: { sections: readonly Section[] }) {
  if (!sections.length) return <p className="text-sm text-muted-foreground">{text.water.none}</p>
  return (
    <ul className="space-y-3">
      {sections.map((s) => {
        const worst = s.exceedances[0]
        return (
          <li key={s.name} className="text-sm leading-snug">
            <span className="font-medium">{s.name}</span>
            <span className="mt-0.5 block text-[13px] text-muted-foreground">
              {worst
                ? text.water.worse(
                    indicators[worst.indicator]?.short ?? worst.indicator,
                    formatNumber(worst.ratio, 1),
                  )
                : text.water.clean}
              {s.exceedances.length > 1 && <> · {text.water.more(s.exceedances.length - 1)}</>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
