import { ArrowDown, ArrowUp } from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"
import { useLatestAir } from "@/api/air"
import { air, pollutants, type PollutantInfo } from "@/content/air"
import { aqiCategory } from "@/lib/aqi"
import {
  normLevel,
  sortTowns,
  summarizeAll,
  type DailyRow,
  type Pollutant,
  type Range,
  type SortDir,
  type TownRow,
  type TownSortKey,
} from "@/lib/airStats"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { formatDay, levelColor } from "./format"
import { Tooltip } from "@/components/ui/tooltip"

const t = air.table

type Props = {
  rows: readonly DailyRow[]
  range: Range
  periodLabel: string
  names: ReadonlyMap<string, string>
  selected: string
  pollutant: Pollutant
  onOpen: (id: string) => void
}

export function AirTable({ rows, range, periodLabel, names, selected, pollutant, onOpen }: Props) {
  const { data: latest } = useLatestAir()
  const [sort, setSort] = useState<{ key: TownSortKey; dir: SortDir }>({ key: pollutant, dir: "desc" })

  // range is a new object on every render — depend on its dates.
  const { from, to } = range
  const summaries = useMemo(() => summarizeAll(rows, pollutants, { from, to }), [rows, from, to])
  const towns = useMemo(() => {
    const list: TownRow[] = [...names].map(([id, name]) => ({
      id,
      name,
      aqi: latest?.get(id)?.us_aqi ?? null,
      summary: summaries.get(id) ?? {},
    }))
    return sortTowns(list, sort.key, sort.dir)
  }, [names, latest, summaries, sort])

  const sortBy = (key: TownSortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" ? "asc" : "desc" },
    )

  return (
    <div className="mt-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="font-heading text-xl font-semibold tracking-[-0.02em]">{t.title(periodLabel)}</h3>
          <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">{t.lead}</p>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
          {(["elevated", "high"] as const).map((level) => (
            <li key={level} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-1.5 w-4 rounded-full"
                style={{ background: levelColor[level] }}
              />
              {t.legend[level]}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table aria-label={t.label} className="w-full min-w-[340px] text-sm tabular-nums">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <SortHeader column="name" sort={sort} onSort={sortBy}>
                {t.town}
              </SortHeader>
              <SortHeader column="aqi" sort={sort} onSort={sortBy}>
                <span className="md:hidden">{t.aqiShort}</span>
                <span className="max-md:hidden">{t.aqi}</span>
              </SortHeader>
              {pollutants.map((p) => (
                <SortHeader key={p.key} column={p.key} sort={sort} onSort={sortBy}>
                  <span className="font-medium">{p.label}</span>
                  <span className="max-md:hidden">{t.norm(p.norm)}</span>
                </SortHeader>
              ))}
            </tr>
          </thead>
          <tbody>
            {towns.map((town) => {
              const isSelected = town.id === selected
              const category = aqiCategory(town.aqi)
              return (
                <tr
                  key={town.id}
                  onClick={() => onOpen(town.id)}
                  className={cn(
                    "cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-muted/60",
                    isSelected && "bg-muted",
                  )}
                >
                  <th scope="row" className="py-2 pr-2 text-left font-normal md:pr-3">
                    <Tooltip content={t.open(town.name)} side="right" delayDuration={500}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpen(town.id)
                        }}
                        className={cn(
                          "cursor-pointer text-left underline decoration-transparent underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-ring",
                          isSelected ? "font-semibold" : "font-medium",
                        )}
                      >
                        {town.name}
                      </button>
                    </Tooltip>
                  </th>
                  <td className="py-2 pr-2 md:pr-3">
                    {town.aqi == null || !category ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <Tooltip content={category.label} side="top">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            aria-hidden="true"
                            className="size-2 rounded-full"
                            style={{ background: category.color }}
                          />
                          {Math.round(town.aqi)}
                        </span>
                      </Tooltip>
                    )}
                  </td>
                  {pollutants.map((p) => (
                    <DaysCell key={p.key} info={p} summary={town.summary[p.key]} />
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SortHeader({
  column,
  sort,
  onSort,
  children,
}: {
  column: TownSortKey
  sort: { key: TownSortKey; dir: SortDir }
  onSort: (key: TownSortKey) => void
  children: ReactNode
}) {
  const active = sort.key === column
  const Arrow = sort.dir === "asc" ? ArrowUp : ArrowDown
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className="py-2 pr-2 font-normal md:pr-3"
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex cursor-pointer items-start gap-1 text-left transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
          active && "text-foreground",
        )}
      >
        <span className="flex flex-col">{children}</span>
        <Arrow
          aria-hidden="true"
          className={cn("mt-0.5 size-3.5 flex-none", !active && "invisible max-md:hidden")}
        />
      </button>
    </th>
  )
}

function DaysCell({ info, summary }: { info: PollutantInfo; summary: TownRow["summary"][Pollutant] }) {
  if (!summary || summary.daysTotal === 0) {
    return <td className="py-2 pr-2 text-muted-foreground md:pr-3">—</td>
  }
  const { daysOver, daysTotal, worst } = summary
  const level = worst ? normLevel(worst.value, info.norm) : "ok"
  return (
    <Tooltip
      side="top"
      content={worst ? t.cell(daysOver, daysTotal, formatDay(worst.day), formatNumber(worst.value, 1)) : null}
    >
      <td className="py-2 pr-2 md:pr-3">
        <span className="flex items-center gap-2">
          <span className={cn("w-6 text-right", daysOver > 0 ? "font-semibold" : "text-muted-foreground")}>
            {daysOver}
          </span>
          <span
            aria-hidden="true"
            className="h-1.5 w-14 flex-none overflow-hidden rounded-full bg-muted max-md:hidden"
          >
            <span
              className="block h-full rounded-full"
              style={{ width: `${(daysOver / daysTotal) * 100}%`, background: levelColor[level] }}
            />
          </span>
          {worst && (
            <span className="text-xs text-muted-foreground max-lg:hidden">
              {t.max(formatNumber(worst.value, 1))}
            </span>
          )}
        </span>
      </td>
    </Tooltip>
  )
}
