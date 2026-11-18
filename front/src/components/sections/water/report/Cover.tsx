import { ArrowRight } from "lucide-react"
import { useId, type CSSProperties } from "react"
import { water as text } from "@/content/water"
import { cn } from "@/lib/utils"
import { quarterSeason, type Section } from "@/lib/water"
import { RiversArt } from "./RiversArt"

const r = text.report

export const seasonStyle = (quarter: string) =>
  ({ "--book-cover": `var(--book-${quarterSeason(quarter)})` }) as CSSProperties

export function CoverFront({
  label,
  sections,
  withIssues,
  size,
  badge,
}: {
  label: string
  sections: readonly Section[]
  withIssues: number
  size: "shelf" | "book"
  badge?: string
}) {
  const book = size === "book"
  return (
    <span
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-l-[4px] rounded-r-xl bg-book-cover text-book-cover-ink shadow-[0_30px_60px_-28px_var(--book-shadow)] transition-shadow group-hover:shadow-[0_40px_70px_-26px_var(--book-shadow)]",
        book ? "py-8 pr-8 pl-12" : "py-5 pr-5 pl-8",
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.4),rgb(255_255_255/0.07)_55%,rgb(0_0_0/0.18))]",
          book ? "w-6" : "w-4",
        )}
      />
      <span className={cn("absolute inset-y-0 w-px bg-black/30", book ? "left-6" : "left-4")} />
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgb(255_255_255/0.08),transparent_40%)] opacity-60 transition-opacity group-hover:opacity-100" />

      <span className="relative flex items-start justify-between gap-2">
        <span
          className={cn(
            "font-medium tracking-[0.12em] text-book-cover-muted uppercase",
            book ? "text-[11px]" : "text-[9px]",
          )}
        >
          {r.coverEyebrow}
        </span>
        {badge && (
          <span className="shrink-0 rounded-full bg-book-cover-ink px-2 py-0.5 text-[10px] font-semibold text-book-cover">
            {badge}
          </span>
        )}
      </span>
      <span
        className={cn(
          "relative block font-heading font-semibold tracking-[-0.045em]",
          // leading-* after text-*: tailwind-merge drops leading-* when text-* comes later.
          book
            ? "mt-4 text-[clamp(44px,5vw,68px)] leading-[0.9]"
            : "mt-3 text-[clamp(28px,2.6vw,40px)] leading-[0.9]",
        )}
      >
        {r.coverTitle[0]}
        <br />
        {r.coverTitle[1]}
      </span>
      <span
        className={cn(
          "relative block",
          book ? "mt-4 text-[15px] leading-snug" : "mt-2.5 text-[12px] leading-snug",
        )}
      >
        {r.coverSubtitle}
        <br />
        <span className="text-book-cover-muted">{label}</span>
      </span>

      <RiversArt
        sections={sections}
        tone="cover"
        className={cn("relative mt-auto min-h-0 w-full flex-1", book ? "pt-4" : "pt-2")}
      />

      <span
        className={cn(
          "relative flex items-end justify-between gap-3 border-t border-book-cover-ink/20",
          book ? "mt-3 pt-3 text-[13px]" : "mt-2 pt-2 text-[11px]",
        )}
      >
        <span className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "font-heading font-semibold tabular-nums",
              book ? "text-[26px] leading-none" : "text-xl leading-none",
            )}
          >
            {withIssues}
          </span>
          <span className="max-w-[20ch] leading-tight text-book-cover-muted">
            {r.summary.sections(withIssues)}
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 font-medium">
          {book && r.coverHint}
          <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
        </span>
      </span>
    </span>
  )
}

export function Endpaper() {
  // Unique pattern id per instance: the endpaper appears both on the cover's back and on the left page.
  const id = useId()
  return (
    <svg aria-hidden="true" className="absolute inset-0 size-full opacity-[0.12]" preserveAspectRatio="none">
      <defs>
        <pattern id={id} width="120" height="28" patternUnits="userSpaceOnUse">
          <path
            d="M0 14 C 20 4, 40 4, 60 14 S 100 24, 120 14"
            fill="none"
            stroke="var(--book-river)"
            strokeWidth="1.2"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

export function CoverShade({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 rounded-r-xl bg-[linear-gradient(90deg,transparent_76%,rgb(0_0_0/0.22)_86%,rgb(0_0_0/0.06))]",
        className,
      )}
      style={style}
    />
  )
}

export function PageEdges({ thin = false }: { thin?: boolean }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      <span
        className={cn(
          "absolute left-0 rounded-r-xl border border-book-edge bg-book-paper",
          thin ? "inset-y-1.5 -right-1.5" : "inset-y-2 -right-2",
        )}
      />
      <span
        className={cn(
          "absolute left-0 rounded-r-xl border border-book-edge bg-book-paper",
          thin ? "inset-y-0.5 -right-0.5" : "inset-y-1 -right-1",
        )}
      />
    </span>
  )
}
