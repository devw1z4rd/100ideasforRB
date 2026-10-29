import { useInView } from "motion/react"
import { useMemo, useRef, useState } from "react"
import { useEmissionStats } from "@/api/emissions"
import { HomeSectionShell } from "@/components/sections/HomeSectionShell"
import { Skeleton } from "@/components/ui/skeleton"
import { enterprises as text, HOME_REGION } from "@/content/enterprises"
import type { HomeSection } from "@/content/home"
import { change, emissionYears, mobileFor, regionSeries, regionsForYear } from "@/lib/emissions"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Composition, RegionsTable } from "./RegionsTable"

type Props = Pick<HomeSection, "id" | "eyebrow" | "title" | "variant">

const pct = (v: number, digits = 0) => `${formatNumber(v, digits)}%`
const signed = (v: number) => `${v > 0 ? "+" : "−"}${formatNumber(Math.round(Math.abs(v)))}%`

/**
 * «Предприятия и вклад в загрязнение» (CLAUDE.md §10.7) на данных Белстата по областям: сколько образуется,
 * сколько задерживают очистные установки, сколько уходит в воздух; Гомельская область среди регионов по годам.
 */
export function EnterprisesSection(section: Props) {
  const stats = useEmissionStats()
  const rows = stats.data
  const years = useMemo(() => (rows ? emissionYears(rows) : []), [rows])
  const [picked, setPicked] = useState<number | null>(null)
  const year = picked ?? years[years.length - 1]

  // Бары растут от нуля, когда секция появилась на экране (§10.11)
  const box = useRef<HTMLDivElement>(null)
  const grown = useInView(box, { once: true, margin: "0px 0px -15% 0px" })

  const data = useMemo(() => (rows && year ? regionsForYear(rows, year) : null), [rows, year])
  const series = useMemo(() => (rows ? regionSeries(rows, HOME_REGION) : []), [rows])
  const home = data?.regions.find((r) => r.territory === HOME_REGION)
  const prev = series.find((s) => s.year === year - 1)
  const delta = change(home?.emitted, prev?.emitted)
  const mobile = rows && year ? mobileFor(rows, HOME_REGION, year) : null
  const maxSeries = Math.max(...series.map((s) => s.emitted), 1)

  return (
    <HomeSectionShell {...section} eyebrow={year ? text.eyebrow(year) : section.eyebrow}>
      {stats.isError ? (
        <p className="text-sm text-muted-foreground">{text.error}</p>
      ) : stats.isPending ? (
        <Skeleton className="h-[560px] w-full rounded-xl" />
      ) : !data || !home ? (
        <p className="text-sm text-muted-foreground">{text.empty}</p>
      ) : (
        <div ref={box} className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <div>
            <p className="max-w-[60ch] text-base leading-[1.55] text-muted-foreground">{text.lead}</p>

            {/* Выбор года — он же мини-график выбросов области по годам */}
            <div role="radiogroup" aria-label={text.yearLabel} className="mt-8 flex items-end gap-1.5">
              {series.map((s) => (
                <button
                  key={s.year}
                  type="button"
                  role="radio"
                  aria-checked={s.year === year}
                  aria-label={`${s.year}: ${formatNumber(s.emitted, 1)} ${text.headline.unit}`}
                  onClick={() => setPicked(s.year)}
                  className="group flex w-14 cursor-pointer flex-col items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="flex h-12 w-full items-end">
                    <span
                      className={cn(
                        "w-full rounded-t-sm transition-[height,background-color] duration-500",
                        s.year === year ? "bg-destructive" : "bg-foreground/25 group-hover:bg-foreground/45",
                      )}
                      style={{ height: grown ? `${(s.emitted / maxSeries) * 100}%` : "0%" }}
                    />
                  </span>
                  <span
                    className={cn(
                      "text-[13px] tabular-nums",
                      s.year === year ? "font-semibold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {s.year}
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-8 flex items-baseline gap-3">
              <span className="font-heading text-[clamp(64px,8vw,104px)] leading-none font-semibold tracking-[-0.05em] text-destructive tabular-nums">
                {formatNumber(Math.round(home.emitted))}
              </span>
              <span className="text-lg text-muted-foreground">{text.headline.unit}</span>
            </p>
            <p className="mt-2 text-sm">{text.headline.caption(year)}</p>
            <p className="mt-3 flex flex-wrap gap-2 text-[13px]">
              {delta != null && (
                <span
                  className={cn(
                    "rounded-md px-2 py-1 tabular-nums",
                    delta < 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
                  )}
                >
                  {text.headline.vsPrev(signed(delta), year - 1)}
                </span>
              )}
              <span className="rounded-md bg-muted px-2 py-1">
                {text.headline.place(home.rank, data.regions.length)}
              </span>
            </p>

            <Funnel
              generated={home.generated}
              captured={home.captured}
              emitted={home.emitted}
              grown={grown}
            />

            {mobile != null && (
              <div className="mt-8">
                <p className="text-[13px] text-muted-foreground">{text.transport.title}</p>
                <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-muted">
                  <span
                    className="bg-destructive transition-[width] duration-700"
                    style={{ width: grown ? `${(home.emitted / (home.emitted + mobile)) * 100}%` : "0%" }}
                  />
                  <span className="flex-1 bg-foreground/30" />
                </div>
                <p className="mt-2 flex justify-between text-[13px] tabular-nums">
                  <span>
                    <span className="font-medium">{formatNumber(Math.round(home.emitted))}</span>{" "}
                    {text.transport.enterprises}
                  </span>
                  <span className="text-muted-foreground">
                    {text.transport.vehicles}{" "}
                    <span className="font-medium text-foreground">{formatNumber(mobile)}</span>
                  </span>
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {text.transport.caption(pct((home.emitted / (home.emitted + mobile)) * 100))}
                </p>
              </div>
            )}

            <div className="mt-10">
              <p className="text-[13px] text-muted-foreground">{text.sources.title}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {text.sources.items.map((s) => (
                  <li key={s.name} className="rounded-md border border-input px-3 py-1.5 text-[13px]">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {s.what}, {s.where}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[12px] text-muted-foreground">{text.sources.note}</p>
            </div>
          </div>

          <div>
            <RegionsTable rows={rows!} year={year} regions={data.regions} grown={grown} />
            <Composition rows={rows!} year={year} countryEmitted={data.country.emitted} grown={grown} />
          </div>

          <p className="text-[12px] leading-[1.5] text-muted-foreground lg:col-span-2">{text.method}</p>
        </div>
      )}
    </HomeSectionShell>
  )
}

function Funnel({
  generated,
  captured,
  emitted,
  grown,
}: {
  generated: number
  captured: number
  emitted: number
  grown: boolean
}) {
  const steps = [
    { label: text.funnel.generated, value: generated, share: 100, bar: "bg-foreground/30" },
    { label: text.funnel.captured, value: captured, share: (captured / generated) * 100, bar: "bg-success" },
    { label: text.funnel.emitted, value: emitted, share: (emitted / generated) * 100, bar: "bg-destructive" },
  ]
  return (
    <div className="mt-10">
      <p className="text-[13px] text-muted-foreground">{text.funnel.title}</p>
      <ul className="mt-3 space-y-3">
        {steps.map((s, i) => (
          <li key={s.label}>
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span>{s.label}</span>
              <span className="tabular-nums">
                <span className="font-medium">{formatNumber(Math.round(s.value))}</span> {text.headline.unit}
                {i > 0 && <span className="text-muted-foreground"> · {pct(s.share, 1)}</span>}
              </span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-[width] duration-700", s.bar)}
                style={{ width: grown ? `${s.share}%` : "0%" }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
