import { enterprises as text, pollutantShort, pollutantWhat } from "@/content/enterprises"
import { compositionShares, type Stat } from "@/lib/emissions"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { kt, pct } from "./format"
import { NoData, Panel } from "./ui"

const t = text.composition

export function Composition({
  rows,
  year,
  countryEmitted,
  grown,
  className,
}: {
  rows: readonly Stat[]
  year: number
  countryEmitted: number
  grown: boolean
  className?: string
}) {
  const { items, other } = compositionShares(rows, year, countryEmitted)

  return (
    <Panel className={cn("flex flex-col gap-4 p-5 md:px-6", className)}>
      <div>
        <h3 className="font-heading text-lg leading-6 font-semibold tracking-[-0.01em]">{t.title(year)}</h3>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{t.caption(kt(countryEmitted))}</p>
      </div>

      {items.length === 0 ? (
        <NoData className="h-[240px]">{text.noYear(year)}</NoData>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((c) => (
            <Row
              key={c.pollutant}
              name={pollutantShort[c.pollutant] ?? c.pollutant}
              what={pollutantWhat[c.pollutant]}
              value={c.value}
              share={c.share}
              grown={grown}
            />
          ))}
          {other && (
            <Row
              name={t.other}
              what={t.otherWhat}
              value={other.value}
              share={other.share}
              grown={grown}
              muted
            />
          )}
        </ul>
      )}
    </Panel>
  )
}

function Row({
  name,
  what,
  value,
  share,
  grown,
  muted = false,
}: {
  name: string
  what?: string
  value: number
  share: number
  grown: boolean
  muted?: boolean
}) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1">
      <span className="min-w-0 text-[15px] leading-5">
        <span className={cn("font-medium", muted && "text-muted-foreground")}>{name}</span>
        {what && <span className="text-[13px] text-muted-foreground"> — {what}</span>}
      </span>
      <span className="text-right text-[15px] leading-5 whitespace-nowrap tabular-nums">
        <span className="font-semibold">{formatNumber(value, 1)}</span>{" "}
        <span className="text-muted-foreground">
          {text.unit} · {pct(share)}
        </span>
      </span>
      <span aria-hidden className="col-span-2 block h-1.5 overflow-hidden rounded-full bg-bar-faint">
        <span
          className={cn(
            "block h-full rounded-full transition-[width] duration-700 ease-out",
            muted ? "bg-bar-muted" : "bg-bar",
          )}
          style={{ width: grown ? `${share}%` : "0%" }}
        />
      </span>
    </li>
  )
}
