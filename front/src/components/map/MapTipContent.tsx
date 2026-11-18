import { ArrowRight, Maximize2 } from "lucide-react"
import type { ReactNode } from "react"
import { formatDay } from "@/components/sections/air/format"
import { LevelSparkline } from "@/components/sections/water/LevelSparkline"
import { levelPosition } from "@/components/sections/water/levelText"
import { map as text } from "@/content/map"
import { categoryLabels, statusLabels } from "@/content/reports"
import { indicators, months, water as waterText } from "@/content/water"
import { focusTarget, latestReportAnchor, riverPostAnchor } from "@/lib/focusTarget"
import { formatNumber } from "@/lib/format"
import type { PostSummary } from "@/lib/rivers"
import type { Section as WaterSection } from "@/lib/water"
import { riverColor } from "./riverColor"
import { RiverTriangle } from "./RiverTriangle"
import type { MapPlace, MapReport } from "./types"
import { Tooltip } from "@/components/ui/tooltip"

export type MapTip =
  | { kind: "report"; item: MapReport }
  | { kind: "water"; item: WaterSection }
  | { kind: "level"; item: PostSummary }
  | { kind: "place"; item: MapPlace }

/**
 * Содержимое подсказки у маркера на карте (§10.4). У всех одна раскладка: надпись-тип, название и метка
 * состояния, главное число, подробности, внизу тихой строкой источник и ссылка в раздел.
 */
export function MapTipContent({
  tip,
  waterQuarter,
  onExpand,
}: {
  tip: MapTip
  waterQuarter: string
  /** «Развернуть» у поста уровня — окно с подробностями по посту и реке */
  onExpand?: () => void
}) {
  if (tip.kind === "level") return <LevelTip summary={tip.item} onExpand={onExpand} />
  if (tip.kind === "water") return <WaterTip section={tip.item} quarter={waterQuarter} />
  if (tip.kind === "report") {
    const r = tip.item
    return (
      <Shell eyebrow={text.tip.report} title={categoryLabels[r.category]}>
        <p className="mt-1 text-muted-foreground">
          {statusLabels[r.status]} · {r.created}
        </p>
      </Shell>
    )
  }
  const p = tip.item
  return (
    <Shell eyebrow={text.tip.place[p.kind]} title={p.name}>
      {p.note && <p className="mt-1 text-muted-foreground">{p.note}</p>}
    </Shell>
  )
}

function LevelTip({ summary: s, onExpand }: { summary: PostSummary; onExpand?: () => void }) {
  const { post, latest } = s
  // Без порогов «обычный уровень» ничего не значит: метку и строку о пороге не показываем
  const hasThresholds = Boolean(post.low_level || post.flood_level || post.danger_level)
  return (
    <Shell
      eyebrow={text.tip.level}
      action={
        onExpand && (
          <Tooltip content={text.riverDialog.expand} side="top">
            <button
              type="button"
              onClick={onExpand}
              aria-label={text.riverDialog.expand}
              className="-mt-1 -mr-1.5 grid size-6 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Maximize2 aria-hidden="true" className="size-3.5" />
            </button>
          </Tooltip>
        )
      }
      title={
        <>
          {post.name} <span className="font-normal text-muted-foreground">· {post.river}</span>
        </>
      }
      badge={hasThresholds && <Badge color={riverColor[s.status]}>{waterText.levels.status[s.status]}</Badge>}
      footer={
        <Footer source={text.tip.levelSource(formatDay(latest.day))} target={riverPostAnchor(post.code)} />
      }
    >
      <p className="mt-2 flex items-baseline gap-2">
        <span className="font-heading text-[26px] leading-none font-semibold tracking-[-0.02em] tabular-nums">
          {formatNumber(latest.level)}
        </span>
        <span className="text-muted-foreground">{waterText.levels.unit}</span>
        <span className="ml-1 inline-flex items-center gap-1 text-[12px] text-muted-foreground">
          <RiverTriangle trend={s.trend} status={s.status} className="size-2.5" />
          {waterText.levels.change(latest.change)}
        </span>
      </p>
      <LevelSparkline summary={s} className="mt-3" />
      {hasThresholds && <p className="mt-2 text-[12px]">{levelPosition(s)}</p>}
    </Shell>
  )
}

function WaterTip({ section: w, quarter }: { section: WaterSection; quarter: string }) {
  const level = w.worst > 1.5 ? "high" : w.worst > 1 ? "elevated" : "ok"
  return (
    <Shell
      eyebrow={text.tip.water}
      title={w.name}
      badge={
        <Badge color={`var(--level-${level})`}>
          {w.exceedances.length ? text.tip.deviations(w.exceedances.length) : text.tip.clean}
        </Badge>
      }
      footer={<Footer source={text.tip.waterSource(quarter)} target={latestReportAnchor} />}
    >
      {w.exceedances.length ? (
        <ul className="mt-2 space-y-1">
          {w.exceedances.map((e) => (
            <li
              key={`${e.post}-${e.indicator}-${e.month}`}
              className="flex items-baseline justify-between gap-3"
            >
              <span>{indicators[e.indicator]?.short ?? e.indicator}</span>
              <span className="tabular-nums">
                <span
                  className="font-semibold"
                  style={{ color: e.ratio > 1.5 ? "var(--level-high)" : "var(--level-elevated)" }}
                >
                  ×{formatNumber(e.ratio, e.ratio < 1.1 ? 2 : 1)}
                </span>{" "}
                <span className="text-muted-foreground">{months[e.month - 1]}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-muted-foreground">{text.water.clean}</p>
      )}
      {w.exceedances.length > 0 && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {text.tip.ratioHint(formatNumber(w.worst, w.worst < 1.1 ? 2 : 1))}
        </p>
      )}
    </Shell>
  )
}

function Shell({
  eyebrow,
  action,
  title,
  badge,
  footer,
  children,
}: {
  eyebrow: string
  /** Кнопка в правом верхнем углу (у поста — «развернуть») */
  action?: ReactNode
  title: ReactNode
  badge?: ReactNode
  footer?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="w-[256px]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">{eyebrow}</p>
        {action}
      </div>
      <div className="mt-0.5 flex items-start justify-between gap-3">
        <p className="min-w-0 text-[14px] leading-snug font-semibold">{title}</p>
        {badge}
      </div>
      {children}
      {footer}
    </div>
  )
}

function Badge({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap">
      <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  )
}

/** Источник и «Подробнее»: ведёт не просто в раздел «Вода», а к той же реке в нём — прокрутка и подсветка */
function Footer({ source, target }: { source: string; target: string }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-2.5 text-[11px] text-muted-foreground">
      <span className="truncate">{source}</span>
      <a
        href="#water"
        onClick={(e) => {
          e.preventDefault()
          focusTarget(target, "water")
        }}
        className="inline-flex shrink-0 items-center gap-1 font-medium transition-colors hover:text-foreground"
      >
        {text.tip.more}
        <ArrowRight aria-hidden="true" className="size-3" />
      </a>
    </div>
  )
}
