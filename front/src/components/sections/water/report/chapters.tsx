import { ArrowUpRight } from "lucide-react"
import { PageTip } from "./static"
import { indicators, months, water as text } from "@/content/water"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Exceedance, Reading, Section } from "@/lib/water"
import { RiversArt } from "./RiversArt"

const r = text.report
const fmt = (v: number) =>
  formatNumber(
    v,
    v < 1 ? Math.min(4, Math.max(2, -Math.floor(Math.log10(v)) + 2)) : Number.isInteger(v) ? 0 : 1,
  ).replace(/(,\d*?[1-9])0+$/, "$1")
// Slightly above the norm (1.03×) must not read as "1.0×" (no excess).
export const times = (ratio: number) => formatNumber(ratio, ratio < 1.1 ? 2 : 1)
const monthOf = (period: string) => months[Number(period.slice(5, 7)) - 1]
export const indicatorInline = (key: string) => {
  const short = indicators[key]?.short ?? key
  return /^[А-ЯЁ][а-яё]/.test(short) ? short[0].toLowerCase() + short.slice(1) : short
}
const WATER_POST = "водность реки"

export function ratioScale(maxRatio: number) {
  const max = Math.max(2, Math.ceil(maxRatio * 4) / 4 + 0.25)
  const log = max > 4
  const x = (ratio: number) => (log ? Math.log(ratio) / Math.log(max) : (ratio - 1) / (max - 1))
  const ticks = log ? [1, 2, 5, 10, 20, 50].filter((t) => t < max * 0.7) : [1]
  return { max, log, x, ticks }
}

export type ReportData = {
  label: string
  exceedances: readonly Exceedance[]
  sections: readonly Section[]
  hydrology: readonly Reading[]
  temperature: readonly Reading[]
}

export function SummaryPage({ data }: { data: ReportData }) {
  const worst = data.exceedances[0]
  const withIssues = data.sections.filter((s) => s.worst > 1).length
  const rivers = new Set(data.exceedances.map((e) => e.river)).size
  const warmest = Math.max(0, ...data.temperature.map((t) => t.value ?? 0))

  return (
    <div className="flex h-full flex-col">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
        <Stat value={String(withIssues)} caption={r.summary.sections(withIssues)} />
        {worst && (
          <Stat
            value={`×${times(worst.ratio)}`}
            danger={worst.ratio > 1.5}
            caption={`${r.summary.worst}: ${worst.section || worst.river} — ${indicatorInline(
              worst.indicator,
            )}, ${months[worst.month - 1]}`}
          />
        )}
        <Stat value={String(rivers)} caption={r.summary.rivers(rivers)} />
        {data.temperature.length > 0 && (
          <Stat
            value={String(data.temperature.length)}
            caption={`${r.summary.warm(data.temperature.length)}, ${r.summary.warmMax(formatNumber(warmest, 1))}`}
          />
        )}
      </dl>
      <RiversArt sections={data.sections} tone="paper" interactive className="mt-4 min-h-0 w-full flex-1" />
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
        <LegendDot color="var(--level-elevated)" label={r.summary.mapLegend.elevated} />
        <LegendDot color="var(--level-high)" label={r.summary.mapLegend.high} />
        <LegendDot color="var(--muted-foreground)" label={r.summary.mapLegend.none} small />
      </ul>
    </div>
  )
}

function Stat({ value, caption, danger = false }: { value: string; caption: string; danger?: boolean }) {
  return (
    <div className="flex flex-col-reverse justify-end">
      <dt className="mt-1.5 text-[12px] leading-snug text-muted-foreground">{caption}</dt>
      <dd
        className={cn(
          "font-heading text-[44px] leading-none font-semibold tracking-[-0.04em] tabular-nums",
          danger && "text-destructive",
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function LegendDot({ color, label, small = false }: { color: string; label: string; small?: boolean }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cn("rounded-full", small ? "size-1.5" : "size-2.5")}
        style={{ background: color }}
      />
      {label}
    </li>
  )
}

export function ExceedancesPage({
  items,
  scale,
}: {
  items: readonly Exceedance[]
  scale: ReturnType<typeof ratioScale>
}) {
  const x = (ratio: number) => `${scale.x(ratio) * 100}%`
  return (
    <div>
      <div className="grid grid-cols-[minmax(0,10.5rem)_minmax(0,1fr)_2.75rem] gap-x-3 text-[11px] text-muted-foreground">
        <span className="self-end">{scale.log && r.logScale}</span>
        <span className="relative h-4">
          {scale.ticks.map((t) => (
            <span key={t} className="absolute -translate-x-1/2 tabular-nums" style={{ left: x(t) }}>
              {t}×
            </span>
          ))}
          <span className="absolute right-0 translate-x-1/2 tabular-nums">{formatNumber(scale.max, 1)}×</span>
        </span>
        <span />
      </div>
      <ul className="mt-1">
        {items.map((e, i) => {
          const info = indicators[e.indicator]
          const high = e.ratio > 1.5
          const detail = text.plot.value(
            fmt(e.value!),
            e.unit ?? "",
            e.norm_type === "min" ? "не меньше" : "не больше",
            fmt(e.norm!),
            months[e.month - 1],
          )
          return (
            <PageTip
              key={`${e.post}-${e.indicator}-${e.month}`}
              side="top"
              content={e.note ? `${detail}. ${e.note.charAt(0).toUpperCase()}${e.note.slice(1)}` : detail}
            >
              <li
                className="book-row grid grid-cols-[minmax(0,10.5rem)_minmax(0,1fr)_2.75rem] items-center gap-x-3 border-t border-border py-1"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-[13px] font-medium">
                    {e.river} · {info?.short ?? e.indicator}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{e.post}</p>
                </div>
                <div className="relative h-5">
                  <span className="absolute inset-y-[9px] right-0 left-0 rounded-full bg-muted" />
                  {scale.ticks.map((t) => (
                    <span
                      key={t}
                      className={cn(
                        "absolute inset-y-0 w-px",
                        t === 1 ? "bg-foreground/60" : "bg-foreground/10",
                      )}
                      style={{ left: x(t) }}
                    />
                  ))}
                  <span
                    className={cn(
                      "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-book-paper",
                      high ? "bg-level-high" : "bg-level-elevated",
                    )}
                    style={{ left: x(e.ratio) }}
                  />
                </div>
                <span
                  className={cn(
                    "text-right text-[13px] font-medium tabular-nums",
                    high && "text-destructive",
                  )}
                >
                  ×{times(e.ratio)}
                </span>
              </li>
            </PageTip>
          )
        })}
      </ul>
    </div>
  )
}

export function HydrologyPage({ items }: { items: readonly Reading[] }) {
  return (
    <ol className="divide-y divide-border border-y border-border">
      {items.map((h, i) => (
        <li
          key={`${h.river}-${h.post}-${h.period}`}
          className="book-row grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 py-2.5 text-[13px]"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <span className="pt-px text-[12px] text-muted-foreground first-letter:uppercase">
            {h.post === WATER_POST ? r.quarterWater : monthOf(h.period)}
          </span>
          <span>
            <span className="font-medium">{h.section || h.river}</span>
            <span className="mt-0.5 block leading-snug text-fg-secondary">{h.note}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

export function TemperaturePage({ items }: { items: readonly Reading[] }) {
  const sorted = [...items].sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
  const max = Math.max(1, ...sorted.map((t) => t.value ?? 0))
  return (
    <ul className="space-y-4">
      {sorted.map((t, i) => (
        <li key={`${t.post}-${t.period}`} className="book-row" style={{ animationDelay: `${i * 60}ms` }}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate">
              <span className="font-medium">{t.river}</span>{" "}
              <span className="text-muted-foreground">{t.post}</span>
            </span>
            <span className="shrink-0 text-muted-foreground">{monthOf(t.period)}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <span className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="hours-bar block h-full rounded-full"
                style={{
                  width: `${((t.value ?? 0) / max) * 100}%`,
                  background: "linear-gradient(90deg, var(--level-elevated), var(--level-high))",
                  animationDelay: `${200 + i * 60}ms`,
                }}
              />
            </span>
            <span className="w-16 text-right font-heading text-lg font-semibold tabular-nums">
              +{formatNumber(t.value ?? 0, 1)}°
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function GlossaryPage({
  label,
  sourceUrl,
  used,
}: {
  label: string
  sourceUrl?: string
  used: ReadonlySet<string>
}) {
  return (
    <div className="space-y-5">
      <dl className="space-y-3.5">
        {Object.entries(indicators)
          .filter(([key]) => used.has(key))
          .map(([key, info], i) => (
            <div key={key} className="book-row" style={{ animationDelay: `${i * 50}ms` }}>
              <dt className="text-[14px] font-medium">{info.label}</dt>
              <dd className="mt-0.5 text-[13px] leading-snug text-fg-secondary">{info.hint}</dd>
            </div>
          ))}
      </dl>
      <p className="border-t border-border pt-4 text-[12px] leading-[1.5] text-muted-foreground">
        {text.note}
      </p>
      <a
        href={sourceUrl ?? text.qualitySource.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-[13px] font-medium text-link hover:text-link-hover"
      >
        {r.source}: {text.sourceLine(label)}
        <ArrowUpRight aria-hidden="true" className="size-3.5" />
      </a>
    </div>
  )
}
