import { ChevronDown } from "lucide-react"
import { Fragment, useState } from "react"
import { enterprises as text, HOME_REGION, pollutantShort, regionShort } from "@/content/enterprises"
import { compositionForYear, countryMobile, regionSeries, type RegionYear, type Stat } from "@/lib/emissions"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

const pct = (v: number, digits = 0) => `${formatNumber(v, digits)}%`
const TOP = 3

/**
 * Регионы по выбросам предприятий (Парето, §10.7): бар, доля страны, накопленная доля, доля уловленного.
 * Гомельская область выделена; строка раскрывает динамику по годам и путь веществ в регионе.
 */
export function RegionsTable({
  rows,
  year,
  regions,
  grown,
}: {
  rows: readonly Stat[]
  year: number
  regions: readonly RegionYear[]
  grown: boolean
}) {
  const [open, setOpen] = useState<string | null>(HOME_REGION)
  const max = Math.max(...regions.map((r) => r.emitted))
  const topShare = regions[Math.min(TOP, regions.length) - 1]?.cumulative ?? 0

  return (
    <div>
      <p className="font-heading text-[clamp(40px,5vw,64px)] leading-none font-semibold tracking-[-0.04em] tabular-nums">
        {pct(topShare)}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{text.table.top(TOP, pct(topShare))}</p>

      <h3 className="mt-8 font-heading text-xl font-semibold tracking-[-0.02em]">{text.table.title(year)}</h3>
      <p className="mt-1 text-[13px] text-muted-foreground">{text.table.caption}</p>

      <table className="mt-4 w-full text-[13px]">
        <thead>
          <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
            <th scope="col" className="w-8 py-2 font-medium">
              {text.table.cols.rank}
            </th>
            <th scope="col" className="py-2 font-medium">
              {text.table.cols.region}
            </th>
            <th scope="col" className="hidden w-[30%] py-2 sm:table-cell">
              <span className="sr-only">Шкала</span>
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              {text.table.cols.emitted}
            </th>
            <th scope="col" className="py-2 pl-3 text-right font-medium">
              {text.table.cols.share}
            </th>
            <th scope="col" className="hidden py-2 pl-3 text-right font-medium md:table-cell">
              {text.table.cols.cumulative}
            </th>
            <th scope="col" className="hidden py-2 pl-3 text-right font-medium sm:table-cell">
              {text.table.cols.captured}
            </th>
            <th scope="col" className="w-8 py-2">
              <span className="sr-only">Подробнее</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {regions.map((r) => {
            const home = r.territory === HOME_REGION
            const expanded = open === r.territory
            return (
              <Fragment key={r.territory}>
                <tr
                  onClick={() => setOpen(expanded ? null : r.territory)}
                  className={cn(
                    "cursor-pointer border-b border-border transition-colors hover:bg-muted/60",
                    home && "bg-muted",
                  )}
                >
                  <td className="py-2.5 text-muted-foreground tabular-nums">{r.rank}</td>
                  <td className={cn("py-2.5", home && "font-semibold")}>
                    {regionShort[r.territory] ?? r.territory}
                  </td>
                  <td className="hidden py-2.5 pr-3 sm:table-cell">
                    <div className="h-2 rounded-full bg-background/40">
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width] duration-700",
                          home ? "bg-destructive" : "bg-foreground/70",
                        )}
                        style={{ width: grown ? `${(r.emitted / max) * 100}%` : "0%" }}
                      />
                    </div>
                  </td>
                  <td
                    className={cn("py-2.5 text-right tabular-nums", home && "font-semibold text-destructive")}
                  >
                    {formatNumber(r.emitted, 1)}
                  </td>
                  <td className="py-2.5 pl-3 text-right tabular-nums">{pct(r.countryShare)}</td>
                  <td className="hidden py-2.5 pl-3 text-right text-muted-foreground tabular-nums md:table-cell">
                    {pct(r.cumulative)}
                  </td>
                  <td className="hidden py-2.5 pl-3 text-right text-muted-foreground tabular-nums sm:table-cell">
                    {pct(r.capturedShare)}
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-label={`${regionShort[r.territory] ?? r.territory}: подробнее`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpen(expanded ? null : r.territory)
                      }}
                      className="inline-grid size-6 cursor-pointer place-items-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
                    </button>
                  </td>
                </tr>
                {expanded && (
                  <tr className="border-b border-border">
                    <td colSpan={8} className="pt-3 pb-5">
                      <RegionDetail rows={rows} region={r} year={year} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function RegionDetail({ rows, region, year }: { rows: readonly Stat[]; region: RegionYear; year: number }) {
  const series = regionSeries(rows, region.territory)
  const max = Math.max(...series.map((s) => s.emitted), 1)
  const facts = [
    { label: text.table.detail.generated, value: region.generated },
    { label: text.table.detail.captured, value: region.captured, note: pct(region.capturedShare, 1) },
    { label: text.table.detail.emitted, value: region.emitted },
  ]
  return (
    <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <dl className="grid grid-cols-3 gap-3">
        {facts.map((f) => (
          <div key={f.label}>
            <dt className="text-[12px] text-muted-foreground">{f.label}</dt>
            <dd className="mt-0.5 font-heading text-lg font-semibold tabular-nums">
              {formatNumber(Math.round(f.value))}
              {f.note && <span className="ml-1 text-[12px] font-normal text-muted-foreground">{f.note}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <div>
        <p className="text-[12px] text-muted-foreground">{text.table.detail.trend}</p>
        <div className="mt-4 flex h-16 items-end gap-2">
          {series.map((s) => (
            <div key={s.year} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {formatNumber(s.emitted, 0)}
              </span>
              <span
                className={cn("w-full rounded-t-sm", s.year === year ? "bg-foreground" : "bg-foreground/30")}
                style={{ height: `${(s.emitted / max) * 36}px` }}
              />
              <span className="text-[11px] text-muted-foreground tabular-nums">{s.year}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Состав выбросов предприятий страны по веществам и сравнение с транспортом */
export function Composition({
  rows,
  year,
  countryEmitted,
  grown,
}: {
  rows: readonly Stat[]
  year: number
  countryEmitted: number
  grown: boolean
}) {
  const items = compositionForYear(rows, year)
  const mobile = countryMobile(rows, year)
  if (!items.length) return null
  const max = items[0].value
  return (
    <div className="mt-12">
      <h3 className="font-heading text-xl font-semibold tracking-[-0.02em]">
        {text.composition.title(year)}
      </h3>
      <p className="mt-1 text-[13px] text-muted-foreground">{text.composition.caption}</p>
      <ul className="mt-4 space-y-2">
        {items.map((c) => (
          <li
            key={c.pollutant}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-[13px] sm:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_auto]"
          >
            <span className="col-span-2 sm:col-span-1 sm:truncate">
              {pollutantShort[c.pollutant] ?? c.pollutant}
            </span>
            <span className="h-2 rounded-full bg-background/40">
              <span
                className="block h-full rounded-full bg-foreground/70 transition-[width] duration-700"
                style={{ width: grown ? `${(c.value / max) * 100}%` : "0%" }}
              />
            </span>
            <span className="w-12 text-right tabular-nums">{formatNumber(c.value, 1)}</span>
          </li>
        ))}
      </ul>
      {mobile != null && mobile > countryEmitted && (
        <p className="mt-4 text-[13px]">
          {text.composition.transportNote(
            year,
            formatNumber(Math.round(mobile)),
            formatNumber(Math.round(countryEmitted)),
          )}
        </p>
      )}
    </div>
  )
}
