import { Tooltip } from "@/components/ui/tooltip"
import { enterprises as text, HOME_REGION, regionShort } from "@/content/enterprises"
import type { RegionYear } from "@/lib/emissions"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { kt, pct } from "./format"
import { NoData, Panel } from "./ui"

const t = text.table
const TOP = 3
const name = (r: RegionYear) => regionShort[r.territory] ?? r.territory

// Колонки: на телефоне бар — второй строкой под названием, с sm — в одной строке между названием и цифрами
const row =
  "grid grid-cols-[1.25rem_minmax(0,1fr)_auto_2.75rem] items-center gap-x-3 sm:grid-cols-[1.25rem_7.5rem_minmax(0,1fr)_3.5rem_2.75rem]"

/**
 * Регионы по выбросам предприятий за год (§10.7): один бар на регион (тыс. т в воздух, от большего к меньшему)
 * и доля в выбросах страны. Гомельская область выделена. Подробности — сколько образовалось и сколько задержали
 * очистные — в подсказке строки; под списком — сколько дают первые три региона.
 */
export function RegionsTable({
  year,
  regions,
  countryEmitted,
  grown,
  className,
}: {
  year: number
  regions: readonly RegionYear[]
  countryEmitted: number
  grown: boolean
  className?: string
}) {
  const max = Math.max(...regions.map((r) => r.emitted), 1)
  const topShare = regions[Math.min(TOP, regions.length) - 1]?.cumulative ?? 0

  return (
    <Panel className={cn("flex flex-col gap-4 p-5 md:px-6", className)}>
      <div>
        <h3 className="font-heading text-lg leading-6 font-semibold tracking-[-0.01em]">{t.title(year)}</h3>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{t.caption(kt(countryEmitted))}</p>
      </div>

      {regions.length === 0 ? (
        <NoData className="h-[240px]">{t.noData(year)}</NoData>
      ) : (
        <>
          <ol aria-label={t.label} className="flex flex-1 flex-col justify-between">
            {regions.map((r) => {
              const home = r.territory === HOME_REGION
              return (
                <Tooltip
                  key={r.territory}
                  content={t.tip(kt(r.generated), pct(r.capturedShare), formatNumber(r.emitted, 1))}
                >
                  {/* Колонки заданы явно: элементы с одной лишь строкой grid расставляет раньше остальных */}
                  <li
                    className={cn(
                      row,
                      "gap-y-1.5 rounded-lg px-2 py-2 text-[15px] leading-5",
                      home && "bg-panel-highlight",
                    )}
                  >
                    <span className="col-start-1 row-start-1 text-[13px] text-muted-foreground tabular-nums">
                      {r.rank}
                    </span>
                    <span
                      className={cn(
                        "col-start-2 row-start-1 truncate",
                        home ? "font-semibold" : "font-medium",
                      )}
                    >
                      {name(r)}
                    </span>
                    <span
                      aria-hidden
                      className="col-span-3 col-start-2 row-start-2 h-2 sm:col-span-1 sm:col-start-3 sm:row-start-1"
                    >
                      <span
                        className={cn(
                          "block h-full min-w-1 rounded-full transition-[width] duration-700 ease-out",
                          home ? "bg-destructive" : "bg-bar",
                        )}
                        style={{ width: grown ? `${(r.emitted / max) * 100}%` : "0%" }}
                      />
                    </span>
                    <span
                      className={cn(
                        "col-start-3 row-start-1 text-right tabular-nums sm:col-start-4",
                        home ? "font-semibold" : "font-medium",
                      )}
                    >
                      {formatNumber(r.emitted, 1)}
                    </span>
                    <span className="col-start-4 row-start-1 text-right text-muted-foreground tabular-nums sm:col-start-5">
                      {pct(r.countryShare)}
                    </span>
                  </li>
                </Tooltip>
              )
            })}
          </ol>
          <p className="mt-auto flex items-baseline gap-2 border-t border-border pt-3 text-sm leading-5 text-muted-foreground">
            <span className="font-heading text-xl font-semibold text-foreground">{pct(topShare)}</span>
            {t.top(TOP)}
          </p>
        </>
      )}
    </Panel>
  )
}
