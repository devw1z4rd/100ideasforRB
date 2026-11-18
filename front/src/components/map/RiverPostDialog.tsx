import { ArrowRight, ArrowUpRight } from "lucide-react"
import { lazy, Suspense, type ReactNode } from "react"
import { Link } from "react-router"
import { formatDayLong } from "@/components/sections/air/format"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { map as mapText } from "@/content/map"
import { indicators, months, water as waterText } from "@/content/water"
import { focusTarget, riverPostAnchor } from "@/lib/focusTarget"
import { formatNumber } from "@/lib/format"
import { hasThresholds, type PostSummary } from "@/lib/rivers"
import { cn } from "@/lib/utils"
import type { Section as WaterSection } from "@/lib/water"
import { riverColor } from "./riverColor"
import { RiverTriangle } from "./RiverTriangle"

// График bklit (d3 и обвязка графиков) — отдельным чанком: на главной нужен только спарклайн карточек
const RiverLevelChart = lazy(() => import("./RiverLevelChart").then((m) => ({ default: m.RiverLevelChart })))

const text = mapText.riverDialog
const levels = waterText.levels

/**
 * Окно поста уровня воды (§10.4, §10.8): открывается из подсказки на карте («развернуть»), щелчком по посту на карте
 * или по карточке поста в разделе «Вода».
 * Пост крупно — уровень, сутки, график за 30 дней, пороги; ниже — та же река: другие посты области
 * (щелчок переключает окно на них) и качество воды из квартального обзора.
 */
export function RiverPostDialog({
  summary,
  posts,
  sections,
  quarter,
  onSelect,
  onClose,
  inSection = false,
}: {
  /** Открытый пост; null — окно закрыто */
  summary: PostSummary | null
  posts: readonly PostSummary[]
  sections: readonly WaterSection[]
  quarter: string
  onSelect: (postId: string) => void
  onClose: () => void
  /** Окно открыто из раздела «Вода» — ссылка «Раздел «Вода»» внизу не нужна */
  inSection?: boolean
}) {
  return (
    <Dialog open={summary !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-[760px]"
        closeLabel={text.close}
        // Фокус не возвращаем на маркер: фокус показал бы его подсказку поверх только что закрытого окна
        onCloseAutoFocus={(e) => e.preventDefault()}
        // Фокус — на само окно, а не на первую кнопку внутри (строку соседнего поста с рамкой фокуса)
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          ;(e.currentTarget as HTMLElement).focus()
        }}
      >
        {summary && (
          <Body
            summary={summary}
            others={posts.filter((p) => p.post.river === summary.post.river && p.post.id !== summary.post.id)}
            sections={sections.filter((s) => s.river === summary.post.river)}
            quarter={quarter}
            onSelect={onSelect}
            onClose={onClose}
            inSection={inSection}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function Body({
  summary: s,
  others,
  sections,
  quarter,
  onSelect,
  onClose,
  inSection,
}: {
  summary: PostSummary
  others: readonly PostSummary[]
  sections: readonly WaterSection[]
  quarter: string
  onSelect: (postId: string) => void
  onClose: () => void
  inSection: boolean
}) {
  const { post, latest, series } = s
  const thresholds = hasThresholds(post)
  const monthChange = latest.level - series[0].level

  return (
    <>
      <header className="px-6 pt-6 pr-14">
        <p className="text-[12px] text-muted-foreground">{text.eyebrow(formatDayLong(latest.day))}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
          <DialogTitle className="font-heading text-[28px] leading-tight font-semibold tracking-[-0.03em]">
            {post.name} <span className="font-normal text-muted-foreground">· {post.river}</span>
          </DialogTitle>
          {thresholds && <Badge color={riverColor[s.status]}>{levels.status[s.status]}</Badge>}
        </div>
        <DialogDescription className="sr-only">{text.description(post.river, post.name)}</DialogDescription>
      </header>

      <div className="px-6 pb-6">
        <dl className="mt-5 grid grid-cols-3 divide-x divide-border border-y border-border">
          <Stat label={text.now}>
            <span className="font-heading text-[32px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
              {formatNumber(latest.level)}
            </span>{" "}
            <span className="text-muted-foreground">{levels.unit}</span>
          </Stat>
          <Stat label={text.day}>
            <span className="inline-flex items-center gap-1.5 text-[17px] font-semibold tabular-nums">
              <RiverTriangle trend={s.trend} status={s.status} className="size-3" />
              {signed(latest.change)}
            </span>
          </Stat>
          <Stat label={text.month(series.length)}>
            <span className="text-[17px] font-semibold tabular-nums">{signed(monthChange)}</span>
          </Stat>
        </dl>

        {/* key — при переключении на другой пост график рисуется заново, с анимацией */}
        <Suspense fallback={<div className="mt-5 h-[252px]" />}>
          <RiverLevelChart key={post.id} summary={s} />
        </Suspense>

        <section className="mt-6">
          <h3 className="text-[13px] font-semibold">{text.thresholds}</h3>
          {thresholds ? (
            <ul className="mt-2 divide-y divide-border border-y border-border text-[13px]">
              <Threshold kind="low" value={post.low_level} level={latest.level} />
              <Threshold kind="flood" value={post.flood_level} level={latest.level} />
              <Threshold kind="danger" value={post.danger_level} level={latest.level} />
            </ul>
          ) : (
            <p className="mt-1.5 text-[13px] text-muted-foreground">{text.noThresholds}</p>
          )}
          {s.daysLow !== null && (
            <p className="mt-2 text-[12px] text-muted-foreground">
              {levels.daysLow(s.daysLow, series.length)}
            </p>
          )}
          <p className="mt-2 text-[12px] text-muted-foreground">
            {levels.note}{" "}
            <Link to={levels.kb.to} onClick={onClose} className="font-medium text-link hover:text-link-hover">
              {levels.kb.label} →
            </Link>
          </p>
        </section>

        {others.length > 0 && (
          <section className="mt-6">
            <h3 className="text-[13px] font-semibold">{text.others(post.river)}</h3>
            <ul className="mt-2 divide-y divide-border border-y border-border">
              {others.map((o) => (
                <li key={o.post.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(o.post.id)}
                    className="flex w-full cursor-pointer items-center gap-3 px-1 py-2.5 text-left text-[13px] transition-colors hover:bg-muted"
                  >
                    <span className="min-w-0 flex-1 font-medium">{o.post.name}</span>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground tabular-nums">
                      <RiverTriangle trend={o.trend} status={o.status} className="size-2.5" />
                      {signed(o.latest.change)}
                    </span>
                    <span className="w-16 text-right font-semibold tabular-nums">
                      {formatNumber(o.latest.level)} {levels.unit}
                    </span>
                    <span className="hidden w-32 sm:block">
                      {hasThresholds(o.post) && (
                        <Badge color={riverColor[o.status]}>{levels.status[o.status]}</Badge>
                      )}
                    </span>
                    <ArrowRight aria-hidden="true" className="size-3.5 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {sections.length > 0 && (
          <section className="mt-6">
            <h3 className="text-[13px] font-semibold">{text.quality(post.river, quarter)}</h3>
            <ul className="mt-2 divide-y divide-border border-y border-border text-[13px]">
              {sections.map((w) => (
                <li key={w.name} className="py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{w.name}</span>
                    <Badge color={`var(--level-${w.worst > 1.5 ? "high" : w.worst > 1 ? "elevated" : "ok"})`}>
                      {w.exceedances.length
                        ? mapText.tip.deviations(w.exceedances.length)
                        : mapText.tip.clean}
                    </Badge>
                  </div>
                  {w.exceedances.length > 0 && (
                    <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                      {w.exceedances.map((e) => (
                        <span key={`${e.post}-${e.indicator}-${e.month}`}>
                          {indicators[e.indicator]?.short ?? e.indicator}{" "}
                          <span
                            className="font-semibold tabular-nums"
                            style={{ color: e.ratio > 1.5 ? "var(--level-high)" : "var(--level-elevated)" }}
                          >
                            ×{formatNumber(e.ratio, e.ratio < 1.1 ? 2 : 1)}
                          </span>{" "}
                          {months[e.month - 1]}
                        </span>
                      ))}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4 text-[12px] text-muted-foreground">
        <a
          href={waterText.levelsSource.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
        >
          {text.source}
          <ArrowUpRight aria-hidden="true" className="size-3" />
        </a>
        {!inSection && (
          <a
            href="#water"
            onClick={(e) => {
              // Сначала закрыть окно (оно запирает прокрутку страницы), потом ехать к разделу
              e.preventDefault()
              onClose()
              setTimeout(() => focusTarget(riverPostAnchor(post.code), "water"), 250)
            }}
            className="inline-flex items-center gap-1 font-medium transition-colors hover:text-foreground"
          >
            {text.toSection}
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </a>
        )}
      </footer>
    </>
  )
}

const signed = (cm: number) =>
  cm === 0 ? `0 ${levels.unit}` : `${cm > 0 ? "+" : "−"}${Math.abs(cm)} ${levels.unit}`

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="px-4 py-3 first:pl-0">
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className="mt-1.5">{children}</dd>
    </div>
  )
}

function Threshold({
  kind,
  value,
  level,
}: {
  kind: "low" | "flood" | "danger"
  value: number
  level: number
}) {
  if (!value) {
    return (
      <li className="flex items-center justify-between gap-3 py-2 text-muted-foreground">
        <span>{text.threshold[kind]}</span>
        <span>{text.noThreshold}</span>
      </li>
    )
  }
  const diff = level - value
  // Ниже судоходного и выше поймы / опасного — плохо: цветом порога; остальное — спокойным текстом
  const crossed = kind === "low" ? diff < 0 : diff > 0
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-0 w-4 border-t-2 border-dashed"
          style={{ borderColor: riverColor[kind] }}
        />
        {text.threshold[kind]}
        <span className="text-muted-foreground tabular-nums">
          {value} {levels.unit}
        </span>
      </span>
      <span
        className={cn("tabular-nums", !crossed && "text-muted-foreground")}
        style={crossed ? { color: riverColor[kind] } : undefined}
      >
        {text.relation(kind, diff)}
      </span>
    </li>
  )
}

function Badge({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-[12px] font-medium whitespace-nowrap">
      <span aria-hidden="true" className="size-2 rounded-full" style={{ background: color }} />
      {children}
    </span>
  )
}
