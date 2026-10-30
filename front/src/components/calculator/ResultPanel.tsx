import { useState } from "react"
import { calculator as text, targets } from "@/content/calculator"
import type { Category, Footprint, Suggestion } from "@/lib/carbon"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

const categories: readonly Category[] = ["food", "home", "car", "transit", "flights"]
// Оттенки основного цвета: категории различимы и без «тревожных» цветов — красный здесь ничего не значит
const tone: Record<Category, string> = {
  food: "bg-foreground",
  home: "bg-foreground/75",
  car: "bg-foreground/55",
  transit: "bg-foreground/38",
  flights: "bg-foreground/22",
}

const tonnes = (kg: number) => formatNumber(kg / 1000, 1)
// Экономию округляем до 10 кг — точнее коэффициенты всё равно не дают
const kgRounded = (kg: number) => formatNumber(Math.max(10, Math.round(kg / 10) * 10))

/** Итог: тонны в год, из чего складываются, сравнение с целями 1,5 °C и что даст больше всего */
export function ResultPanel({
  result,
  suggestions,
  onReset,
  className,
}: {
  result: Footprint
  suggestions: readonly Suggestion[]
  onReset: () => void
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const total = result.total
  const t2030 = targets[0].t * 1000
  const scaleMax = Math.max(total, t2030) * 1.1
  const pct = (kg: number) => `${(kg / scaleMax) * 100}%`

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // буфер обмена недоступен — ссылка всё равно в адресной строке
    }
  }

  return (
    <section
      aria-labelledby="calc-result"
      className={cn("rounded-xl border border-border p-5 md:p-6", className)}
    >
      <h2
        id="calc-result"
        className="scroll-mt-[calc(var(--header-h)+2.5rem)] text-[13px] font-medium text-muted-foreground"
      >
        {text.result.title}
      </h2>
      <p className="mt-2 flex items-baseline gap-2" aria-live="polite">
        <span className="font-heading text-[64px] leading-none font-semibold tracking-[-0.04em] tabular-nums">
          {tonnes(total)}
        </span>
        <span className="text-sm text-muted-foreground">{text.result.unit}</span>
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {total > t2030 ? text.result.vsTarget(formatNumber(total / t2030, 1)) : text.result.belowTarget}
      </p>

      {/* Из чего складывается */}
      <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        {categories.map((c) =>
          result[c] > 0 ? (
            <span
              key={c}
              className={cn("h-full transition-[width] duration-300", tone[c])}
              style={{ width: `${(result[c] / Math.max(total, 1)) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <dl className="mt-3 space-y-1.5 text-[14px]">
        {categories.map((c) => (
          <div key={c} className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2">
              <span aria-hidden="true" className={cn("size-2.5 rounded-full", tone[c])} />
              {text.result.categories[c]}
            </dt>
            <dd className={cn("tabular-nums", result[c] === 0 && "text-muted-foreground")}>
              {tonnes(result[c])} т
              <span className="ml-2 inline-block w-10 text-right text-muted-foreground">
                {total > 0 ? `${Math.round((result[c] / total) * 100)}%` : ""}
              </span>
            </dd>
          </div>
        ))}
      </dl>

      {/* Сравнение с целями */}
      <div className="mt-6 border-t border-border pt-5">
        <div className="relative h-14">
          <div className="absolute inset-x-0 top-6 h-1.5 rounded-full bg-muted" />
          <div
            className="absolute top-6 left-0 h-1.5 rounded-full bg-foreground transition-[width] duration-300"
            style={{ width: pct(total) }}
          />
          <span
            className="absolute top-0 -translate-x-1/2 text-center text-[11px] leading-tight whitespace-nowrap text-muted-foreground tabular-nums"
            style={{ left: pct(t2030) }}
          >
            {text.result.target(targets[0].year, formatNumber(targets[0].t, 1))}
            <span className="mx-auto mt-1 block h-5 w-px bg-foreground/60" />
          </span>
        </div>
        <p className="mt-3 text-[12px] leading-[1.5] text-muted-foreground">{text.result.targetCaption}</p>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-5 border-t border-border pt-5">
          <h3 className="text-[13px] font-medium">{text.result.suggestionsTitle}</h3>
          <ul className="mt-2 space-y-2 text-[14px]">
            {suggestions.slice(0, 4).map((s) => (
              <li key={s.key} className="flex items-baseline justify-between gap-3">
                <span>{text.result.suggestions[s.key]}</span>
                <span className="shrink-0 font-medium text-success tabular-nums">
                  {text.result.saving(kgRounded(s.saving))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={share}
          className="h-9 cursor-pointer rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          {copied ? text.result.copied : text.result.share}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="h-9 cursor-pointer rounded-md border border-input px-3 text-[13px] font-medium transition-colors hover:bg-muted"
        >
          {text.result.reset}
        </button>
      </div>
    </section>
  )
}
