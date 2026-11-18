import { enterprises as text } from "@/content/enterprises"
import type { RegionYear } from "@/lib/emissions"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { kt } from "./format"
import { PollutionFlow } from "./PollutionFlow"
import { Panel } from "./ui"

type Props = {
  year: number
  home: RegionYear
  total: number
  delta: number | null
  grown: boolean
  className?: string
}

export function RegionCard({ year, home, total, delta, grown, className }: Props) {
  return (
    <Panel
      className={cn(
        "grid gap-6 p-5 md:px-6 md:py-5 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] lg:gap-10",
        className,
      )}
    >
      <div className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2.5 font-heading text-lg leading-6 font-semibold tracking-[-0.01em]">
          <span aria-hidden className="size-2.5 flex-none rounded-full bg-destructive" />
          {text.region.title(year)}
        </h3>
        {/* No tabular-nums: monospaced digits look loose on a single large number. */}
        <p className="mt-1 flex items-baseline gap-2">
          <span className="font-heading text-[80px] leading-[0.8] font-semibold tracking-[-0.045em] text-destructive md:text-[96px]">
            {kt(home.emitted)}
          </span>
          <span className="text-lg font-semibold text-muted-foreground">{text.unit}</span>
        </p>
        <p className="max-w-[30ch] text-[15px] leading-5">{text.headline.caption(year)}</p>
        <p className="mt-1 flex flex-wrap gap-2">
          {delta != null && <DeltaChip delta={delta} year={year} />}
          <span className="rounded-full bg-panel-highlight px-3 py-1 text-sm leading-5 font-semibold">
            {text.headline.place(home.rank, total)}
          </span>
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-4 max-lg:border-t max-lg:border-border max-lg:pt-5 lg:border-l lg:border-border lg:pl-10">
        <div>
          <h4 className="text-base leading-5 font-semibold">{text.flow.title}</h4>
          <p className="mt-1 max-w-[70ch] text-sm leading-5 text-muted-foreground">{text.flow.caption}</p>
        </div>
        <PollutionFlow home={home} grown={grown} />
      </div>
    </Panel>
  )
}

function DeltaChip({ delta, year }: { delta: number; year: number }) {
  const rounded = Math.round(delta)
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : ""
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-sm leading-5 font-semibold tabular-nums",
        rounded < 0 && "bg-success/15 text-success-ink",
        rounded > 0 && "bg-destructive/15 text-destructive-ink",
        rounded === 0 && "bg-panel-highlight",
      )}
    >
      {text.headline.vsPrev(`${sign}${formatNumber(Math.abs(rounded))}%`, year - 1)}
    </span>
  )
}
