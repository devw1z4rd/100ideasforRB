import { Droplets, Thermometer } from "lucide-react"
import { useMemo, useState } from "react"
import { useWaterReadings } from "@/api/water"
import { HomeSectionShell } from "@/components/sections/HomeSectionShell"
import { Skeleton } from "@/components/ui/skeleton"
import type { HomeSection } from "@/content/home"
import { indicators, months, water as text } from "@/content/water"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { byIndicator, exceedances, latestQuarter, quarterLabel, sections } from "@/lib/water"
import { RiverLevels } from "./RiverLevels"

type Props = Pick<HomeSection, "id" | "eyebrow" | "title" | "variant">

// Шкала точечного графика: от норматива (1×) до чуть больше худшего случая, но не меньше 2×
const minScale = 2
const fmt = (v: number) => formatNumber(v, v < 0.1 ? 3 : v < 10 ? 1 : 0)
// Чуть выше норматива (1,03×) не должно выглядеть как «1,0×» — без превышения
const times = (ratio: number) => formatNumber(ratio, ratio < 1.1 ? 2 : 1)

/**
 * «Состояние поверхностных вод» (CLAUDE.md §10.8): уровни воды на постах Белгидромета сегодня, затем последний
 * квартальный обзор качества — точечный график «во сколько раз хуже норматива», водность и температурный режим.
 */
export function WaterSection(section: Props) {
  const readings = useWaterReadings()
  const rows = readings.data
  const quarter = rows ? latestQuarter(rows) : null
  const [river, setRiver] = useState<string | null>(null)

  const all = useMemo(() => (rows && quarter ? exceedances(rows, quarter) : []), [rows, quarter])
  const rivers = [...new Set(all.map((e) => e.river))]
  const shown = river ? all.filter((e) => e.river === river) : all
  const scaleMax = Math.max(minScale, Math.ceil((all[0]?.ratio ?? 1) * 4) / 4 + 0.25)
  const x = (ratio: number) => `${((ratio - 1) / (scaleMax - 1)) * 100}%`
  const withIssues = rows && quarter ? sections(rows, quarter).filter((s) => s.worst > 1).length : 0
  // Сначала водность рек за квартал, потом отдельные события у городов
  const hydrology =
    rows && quarter
      ? [...byIndicator(rows, quarter, "hydrology")].sort((a, b) => Number(!!a.section) - Number(!!b.section))
      : []
  const temperature = rows && quarter ? byIndicator(rows, quarter, "temperature") : []
  const label = quarter ? quarterLabel(quarter) : ""
  const worst = all[0]

  return (
    <HomeSectionShell {...section}>
      <p className="max-w-[62ch] text-base leading-[1.55] text-fg-secondary">{text.lead}</p>

      <div className="mt-10">
        <RiverLevels />
      </div>

      <div className="mt-16 border-t border-border pt-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <h3 className="font-heading text-xl font-semibold tracking-[-0.02em]">
            {text.quality.title}
            {quarter && <span className="font-normal text-muted-foreground"> · {label}</span>}
          </h3>
          {quarter && (
            <a
              href={text.qualitySource.url}
              target="_blank"
              rel="noreferrer"
              className="text-[13px] font-medium text-link hover:text-link-hover"
            >
              {text.sourceLine(label)} →
            </a>
          )}
        </div>
        {readings.isError ? (
          <p className="text-sm text-muted-foreground">{text.error}</p>
        ) : readings.isPending ? (
          <Skeleton className="h-[480px] w-full rounded-xl" />
        ) : !rows || !quarter ? (
          <p className="text-sm text-muted-foreground">{text.empty}</p>
        ) : (
          <>
            <p className="mt-3 max-w-[70ch] text-sm leading-[1.55] text-muted-foreground">
              {text.quality.lead}
            </p>

            <div className="mt-6 grid gap-6 border-y border-border py-6 sm:grid-cols-2 lg:grid-cols-[auto_1fr] lg:gap-16">
              <p className="flex items-baseline gap-3">
                <span className="font-heading text-[56px] leading-none font-semibold tracking-[-0.04em] tabular-nums">
                  {withIssues}
                </span>
                <span className="max-w-[18ch] text-sm text-muted-foreground">{text.summary.sections}</span>
              </p>
              {worst && (
                <p className="text-sm">
                  <span className="text-[13px] text-muted-foreground">{text.summary.worst}: </span>
                  <span className="font-medium">{worst.section || worst.river}</span> —{" "}
                  {indicators[worst.indicator]?.short ?? worst.indicator}{" "}
                  <span className="font-medium text-destructive tabular-nums">
                    {text.summary.times(formatNumber(worst.ratio, 1))}
                  </span>{" "}
                  <span className="text-muted-foreground">({months[worst.month - 1]})</span>
                </p>
              )}
            </div>

            <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
              <div>
                <h4 className="font-heading text-lg font-semibold tracking-[-0.02em]">{text.plot.title}</h4>
                <p className="mt-1 max-w-[70ch] text-[13px] text-muted-foreground">{text.plot.caption}</p>

                <div role="radiogroup" aria-label="Река" className="mt-4 flex flex-wrap gap-2">
                  {[null, ...rivers].map((r) => (
                    <button
                      key={r ?? "all"}
                      type="button"
                      role="radio"
                      aria-checked={river === r}
                      onClick={() => setRiver(r)}
                      className={cn(
                        "h-8 cursor-pointer rounded-md border px-3 text-[13px] transition-colors",
                        river === r
                          ? "border-transparent bg-primary text-primary-foreground"
                          : "border-input text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {r ?? text.plot.all}
                    </button>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 text-[12px] text-muted-foreground sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto]">
                  <span className="hidden sm:block" />
                  <span className="relative col-span-1 h-4">
                    <span className="absolute left-0 -translate-x-1/2">1×</span>
                    <span className="absolute right-0 translate-x-1/2 tabular-nums">
                      {formatNumber(scaleMax, 1)}×
                    </span>
                  </span>
                  <span className="w-10" />
                </div>

                <ul className="mt-1">
                  {shown.map((e) => {
                    const info = indicators[e.indicator]
                    const high = e.ratio > 1.5
                    return (
                      <li
                        key={`${e.post}-${e.indicator}-${e.month}`}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-t border-border py-3 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto]"
                      >
                        <div className="col-span-2 text-[13px] sm:col-span-1">
                          <p className="font-medium">
                            {e.river} · {info?.short ?? e.indicator}
                          </p>
                          <p className="text-muted-foreground">{e.post}</p>
                        </div>
                        <div className="relative h-5" title={info?.hint}>
                          <span className="absolute inset-y-[9px] right-0 left-0 rounded-full bg-muted" />
                          <span className="absolute inset-y-0 left-0 w-px bg-foreground/60" />
                          <span
                            className={cn(
                              "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background",
                              high ? "bg-level-high" : "bg-level-elevated",
                            )}
                            style={{ left: x(e.ratio) }}
                          />
                        </div>
                        <span
                          className={cn(
                            "w-10 text-right text-[13px] font-medium tabular-nums",
                            high ? "text-destructive" : "",
                          )}
                        >
                          ×{times(e.ratio)}
                        </span>
                        <p className="col-span-2 text-[12px] text-muted-foreground sm:col-span-2 sm:col-start-2">
                          {text.plot.value(
                            fmt(e.value!),
                            e.unit ?? "",
                            e.norm_type === "min" ? "не меньше" : "не больше",
                            fmt(e.norm!),
                            months[e.month - 1],
                          )}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <div className="space-y-10">
                <div>
                  <h4 className="flex items-center gap-2 font-heading text-lg font-semibold tracking-[-0.02em]">
                    <Droplets aria-hidden="true" className="size-5 text-map-river-label" />
                    {text.hydrology.title}
                  </h4>
                  <ul className="mt-3 divide-y divide-border border-y border-border text-[13px]">
                    {hydrology.map((h) => (
                      <li key={`${h.river}-${h.post}-${h.period}`} className="py-2.5">
                        <span className="font-medium">{h.section || h.river}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {months[Number(h.period.slice(5, 7)) - 1]}
                        </span>
                        <p className="mt-0.5">{h.note}</p>
                      </li>
                    ))}
                  </ul>
                </div>

                {temperature.length > 0 && (
                  <div>
                    <h4 className="flex items-center gap-2 font-heading text-lg font-semibold tracking-[-0.02em]">
                      <Thermometer aria-hidden="true" className="size-5 text-level-elevated" />
                      {text.temperature.title}
                    </h4>
                    <ul className="mt-3 divide-y divide-border border-y border-border text-[13px]">
                      {[...temperature]
                        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
                        .map((t) => (
                          <li key={`${t.post}-${t.period}`} className="flex justify-between gap-3 py-2.5">
                            <span>
                              <span className="font-medium">{t.river}</span>{" "}
                              <span className="text-muted-foreground">{t.post}</span>
                            </span>
                            <span className="shrink-0 tabular-nums">
                              {text.temperature.value(formatNumber(t.value ?? 0, 1))} ·{" "}
                              <span className="text-muted-foreground">
                                {months[Number(t.period.slice(5, 7)) - 1]}
                              </span>
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-12">
              <h4 className="font-heading text-lg font-semibold tracking-[-0.02em]">{text.glossary}</h4>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(indicators).map(([key, info]) => (
                  <div key={key} className="rounded-xl border border-border p-4">
                    <dt className="text-sm font-medium">{info.label}</dt>
                    <dd className="mt-1 text-[13px] leading-snug text-muted-foreground">{info.hint}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <p className="mt-6 text-xs leading-[1.5] text-muted-foreground">{text.note}</p>
          </>
        )}
      </div>
    </HomeSectionShell>
  )
}
