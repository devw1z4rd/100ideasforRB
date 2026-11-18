import { ArrowRight } from "lucide-react"
import { useReducedMotion } from "motion/react"
import * as m from "motion/react-m"
import { useMemo, useRef, useState, type RefObject } from "react"
import { months, water as text } from "@/content/water"
import { useMediaQuery } from "@/lib/useMediaQuery"
import { latestReportAnchor } from "@/lib/focusTarget"
import { cn } from "@/lib/utils"
import { quarterLabel, quarters, type Reading } from "@/lib/water"
import { indicatorInline, times } from "./chapters"
import { CoverFront, CoverShade, PageEdges, seasonStyle } from "./Cover"
import { buildReport, ReportDialog } from "./ReportDialog"

const r = text.report
const s = r.shelf

export function WaterShelf({ rows }: { rows: readonly Reading[] }) {
  const desktop = useMediaQuery("(min-width: 1024px)")
  const reduceMotion = useReducedMotion()
  const list = useMemo(() => quarters(rows), [rows])
  const latest = list[list.length - 1]
  const reports = useMemo(() => new Map(list.map((q) => [q, buildReport(rows, q)])), [rows, list])
  const [active, setActive] = useState<string | null>(null)
  const [landing, setLanding] = useState(false)
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const books = useRef(new Map<string, HTMLSpanElement>())
  const origin: RefObject<HTMLElement | null> = useMemo(
    () => ({
      get current() {
        return active ? (books.current.get(active) ?? null) : null
      },
    }),
    [active],
  )

  const last = reports.get(latest)
  if (!last) return null
  const withIssues = last.sections.filter((x) => x.worst > 1).length
  const worst = last.exceedances[0]

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:items-end lg:gap-14">
      <div>
        <p className="text-[13px] font-medium text-muted-foreground">{s.eyebrow}</p>
        <h3 className="mt-2 font-heading text-[clamp(28px,3vw,40px)] leading-[1.05] font-semibold tracking-[-0.03em]">
          {s.title}
        </h3>
        <p className="mt-3 text-[15px] leading-[1.55] text-fg-secondary">{s.lead}</p>

        <p className="mt-6 text-[13px] font-medium">{s.latest(last.label)}</p>
        <dl className="mt-3 flex flex-wrap gap-x-10 gap-y-4">
          <div className="flex flex-col-reverse justify-end">
            <dt className="mt-1 max-w-[18ch] text-[12px] leading-snug text-muted-foreground">
              {r.summary.sections(withIssues)}
            </dt>
            <dd className="font-heading text-[40px] leading-none font-semibold tracking-[-0.04em] tabular-nums">
              {withIssues}
            </dd>
          </div>
          {worst && (
            <div className="flex flex-col-reverse justify-end">
              <dt className="mt-1 max-w-[24ch] text-[12px] leading-snug text-muted-foreground">
                {r.summary.worst}: {worst.section || worst.river} — {indicatorInline(worst.indicator)},{" "}
                {months[worst.month - 1]}
              </dt>
              <dd
                className={cn(
                  "font-heading text-[40px] leading-none font-semibold tracking-[-0.04em] tabular-nums",
                  worst.ratio > 1.5 && "text-destructive",
                )}
              >
                ×{times(worst.ratio)}
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
          <button
            type="button"
            onClick={() => setActive(latest)}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {r.open}
            <ArrowRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>

      <div className="min-w-0 lg:ml-auto lg:w-fit">
        <ul
          aria-label={s.label}
          className="-mx-4 flex snap-x snap-mandatory items-end gap-5 overflow-x-auto px-4 pt-4 pb-1 sm:mx-0 sm:px-0 lg:gap-7 lg:overflow-visible lg:px-6"
        >
          {list.map((q, i) => {
            const report = reports.get(q)!
            return (
              // Stagger the li, not the book: the dialog measures the book's position for the flight.
              <m.li
                key={q}
                className="shrink-0 snap-start"
                initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i * 0.09 }}
              >
                <button
                  ref={(el) => {
                    if (el) buttons.current.set(q, el)
                    else buttons.current.delete(q)
                  }}
                  type="button"
                  aria-label={r.coverAria(quarterLabel(q))}
                  onClick={() => setActive(q)}
                  style={seasonStyle(q)}
                  className={cn(
                    "group [container-type:inline-size] relative block aspect-[3/4] w-[200px] cursor-pointer text-left outline-none lg:w-[clamp(200px,16vw,290px)]",
                    // The open book has left the shelf: the flying copy looks identical in its first frame,
                    // so the shelf copy hides instantly and reappears under it on landing.
                    desktop && active === q && !landing && "opacity-0",
                  )}
                >
                  <span
                    ref={(el) => {
                      if (el) books.current.set(q, el)
                      else books.current.delete(q)
                    }}
                    id={q === latest ? latestReportAnchor : undefined}
                    className="relative block size-full rounded-r-xl [perspective:400cqw] group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-ring"
                  >
                    <PageEdges thin />
                    <span className="absolute inset-0 rounded-r-xl bg-book-paper" />
                    <CoverShade className="opacity-0 transition-opacity duration-700 group-hover:opacity-100 group-focus-visible:opacity-100" />
                    <span
                      data-book-cover
                      className="absolute inset-0 origin-left transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:[transform:rotateY(-32deg)] group-focus-visible:[transform:rotateY(-32deg)] motion-reduce:transition-none"
                    >
                      <CoverFront
                        label={report.label}
                        sections={report.sections}
                        withIssues={report.sections.filter((x) => x.worst > 1).length}
                        size="shelf"
                        badge={q === latest ? s.newBadge : undefined}
                      />
                    </span>
                  </span>
                </button>
              </m.li>
            )
          })}
        </ul>
        {/* Shelf board (disabled) */}
        {/* <div
          aria-hidden="true"
          className="h-3 rounded-[3px] border-t border-book-edge bg-[linear-gradient(180deg,var(--book-paper),var(--book-edge))] shadow-[0_14px_24px_-14px_var(--book-shadow)]"
        /> */}
      </div>

      {active && (
        <ReportDialog
          key={active}
          rows={rows}
          quarter={active}
          origin={origin}
          onLand={() => setLanding(true)}
          onDone={() => {
            const button = buttons.current.get(active)
            setActive(null)
            setLanding(false)
            requestAnimationFrame(() => button?.focus({ preventScroll: true }))
          }}
        />
      )}
    </div>
  )
}
