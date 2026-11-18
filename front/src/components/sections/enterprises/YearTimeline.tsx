import { ChevronLeft, ChevronRight } from "lucide-react"
import { enterprises as text } from "@/content/enterprises"
import { cn } from "@/lib/utils"
import { kt } from "./format"

const t = text.timeline

const roundButton =
  "grid size-11 flex-none cursor-pointer place-items-center rounded-full border border-rule bg-panel-raised text-foreground transition-colors hover:bg-input disabled:cursor-default disabled:opacity-40 disabled:hover:bg-panel-raised"

/**
 * Выбор года — он же мини-график выбросов области по годам; ← → — соседний год.
 * Прилипание (сверху под шапкой / снизу на мобиле) задаёт секция.
 */
export function YearTimeline({
  series,
  year,
  grown,
  onPick,
}: {
  series: readonly { year: number; emitted: number }[]
  year: number
  grown: boolean
  onPick: (year: number) => void
}) {
  const index = series.findIndex((s) => s.year === year)
  const max = Math.max(...series.map((s) => s.emitted), 1)

  return (
    <nav
      aria-label={t.label}
      className="flex items-center gap-2 border-t border-input bg-card px-3 pt-2.5 pb-[max(14px,env(safe-area-inset-bottom))] md:flex-wrap md:gap-x-6 md:gap-y-2 md:rounded-2xl md:border md:border-panel-border md:px-5 md:py-1.5"
    >
      <div className="flex flex-none items-center gap-2">
        <button
          type="button"
          onClick={() => onPick(series[index - 1].year)}
          disabled={index <= 0}
          aria-label={t.prev}
          className={cn(roundButton, "max-md:hidden")}
        >
          <ChevronLeft aria-hidden className="size-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => onPick(series[index + 1].year)}
          disabled={index >= series.length - 1}
          aria-label={t.next}
          className={cn(roundButton, "max-md:hidden")}
        >
          <ChevronRight aria-hidden className="size-[18px]" />
        </button>
      </div>

      <p className="flex min-w-[120px] flex-col max-md:hidden">
        <span className="text-xs leading-4 text-fg-dim">{t.title}</span>
        <span className="text-sm leading-5 text-muted-foreground">{t.unit}</span>
      </p>

      <div className="flex min-w-0 flex-1 items-stretch md:basis-[520px]">
        {series.map((s) => {
          const selected = s.year === year
          return (
            <button
              key={s.year}
              type="button"
              aria-pressed={selected}
              aria-label={t.year(s.year, kt(s.emitted))}
              onClick={() => onPick(s.year)}
              className="group flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col items-center gap-0.5"
            >
              <span
                className={cn(
                  "text-xs leading-[14px] tabular-nums md:leading-3",
                  selected ? "font-bold text-foreground" : "font-medium text-fg-dim",
                )}
              >
                {kt(s.emitted)}
              </span>
              <span className="flex h-5 w-full items-end justify-center md:h-4">
                <span
                  className={cn(
                    "w-6 rounded-t-[3px] rounded-b-[1px] transition-[height,background-color] duration-500 ease-out md:w-9 md:rounded-t-sm",
                    selected ? "bg-destructive" : "bg-bar-faint group-hover:bg-bar-muted",
                  )}
                  style={{ height: grown ? `${(s.emitted / max) * 100}%` : "0%" }}
                />
              </span>
              <span className="relative h-3 w-full">
                <span className="absolute inset-x-0 top-[5px] h-0.5 bg-rule" />
                <span
                  className={cn(
                    "absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full",
                    selected ? "bg-destructive" : "bg-bar-muted",
                  )}
                />
              </span>
              <span
                className={cn(
                  "text-sm leading-[18px] tabular-nums md:leading-4",
                  selected
                    ? "font-bold text-foreground"
                    : "font-medium text-muted-foreground group-hover:text-foreground",
                )}
              >
                {s.year}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
