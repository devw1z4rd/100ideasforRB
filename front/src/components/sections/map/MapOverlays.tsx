import { ArrowLeft, ArrowRight } from "lucide-react"
import { Link } from "react-router"
import type { AirReading } from "@/api/air"
import { ReportIcon } from "@/components/map/ReportIcon"
import type { MapTown } from "@/components/map/types"
import { air, pollutants } from "@/content/air"
import { map as text } from "@/content/map"
import { AQI_SCALE, aqiCategory } from "@/lib/aqi"
import { normLevel, type PointSummary } from "@/lib/airStats"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { formatDay, levelColor } from "../air/format"

const panel = "rounded-xl border border-border bg-background/90 p-5 backdrop-blur-sm"
// Шкала до 200, как в макете: выше — редкость для области, отметка упирается в край
const SCALE_MAX = 200
const scaleSegments = AQI_SCALE.filter((c) => c.min < SCALE_MAX)

/**
 * «Воздух сейчас» (оверлей слева сверху): вместо одного AQI по области — сколько городов с хорошим воздухом
 * и где на шкале каждый город. Хуже и лучше всего — кликабельны.
 */
export function AirOverview({
  towns,
  selectedId,
  onSelect,
  reportsOpen,
  reportsResolved,
  className,
}: {
  towns: readonly MapTown[]
  selectedId: string | null
  onSelect: (id: string) => void
  reportsOpen: number
  reportsResolved: number
  className?: string
}) {
  const withData = towns.filter((t) => t.aqi != null)
  const good = withData.filter((t) => aqiCategory(t.aqi)?.level === "good").length
  const sorted = [...withData].sort((a, b) => b.aqi! - a.aqi!)
  const worst = sorted[0]
  const best = sorted[sorted.length - 1]

  const townLink = (t: MapTown) => (
    <button
      type="button"
      onClick={() => onSelect(t.id)}
      className="cursor-pointer text-left underline decoration-border underline-offset-4 hover:decoration-foreground"
    >
      {t.name}
    </button>
  )

  return (
    <section aria-label={text.overview.title} className={cn(panel, className)}>
      <p className="text-[13px] text-muted-foreground">{text.overview.title}</p>
      {withData.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{text.card.noData}</p>
      ) : (
        <>
          <p className="mt-2 font-heading text-[44px] leading-none font-semibold tracking-[-0.04em] tabular-nums">
            {text.overview.good(good, withData.length)}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">{text.overview.goodCaption}</p>

          <div className="relative mt-5">
            <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
              {scaleSegments.map((c) => (
                <span key={c.level} className="flex-1" style={{ background: c.color }} />
              ))}
            </div>
            {withData.map((t) => (
              <span
                key={t.id}
                title={`${t.name}: ${Math.round(t.aqi!)}`}
                className={cn(
                  "absolute top-1/2 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
                  t.id === selectedId ? "z-10 h-5 bg-focus" : "h-3 bg-foreground/80",
                )}
                style={{ left: `${(Math.min(t.aqi!, SCALE_MAX) / SCALE_MAX) * 100}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground tabular-nums">
            {[0, 50, 100, 150, 200].map((v) => (
              <span key={v}>{v}</span>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{text.overview.scaleCaption}</p>

          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-border pt-4 text-sm">
            {worst && (
              <div>
                <dt className="text-[12px] text-muted-foreground">{text.overview.worst}</dt>
                <dd className="mt-0.5 font-medium">
                  {townLink(worst)}{" "}
                  <span className="tabular-nums" style={{ color: aqiCategory(worst.aqi)?.color }}>
                    {Math.round(worst.aqi!)}
                  </span>
                </dd>
              </div>
            )}
            {best && best !== worst && (
              <div>
                <dt className="text-[12px] text-muted-foreground">{text.overview.best}</dt>
                <dd className="mt-0.5 font-medium">
                  {townLink(best)}{" "}
                  <span className="tabular-nums" style={{ color: aqiCategory(best.aqi)?.color }}>
                    {Math.round(best.aqi!)}
                  </span>
                </dd>
              </div>
            )}
          </dl>

          <p className="mt-4 text-[12px] text-muted-foreground">{text.overview.reports}</p>
          <dl className="mt-1 grid grid-cols-2 gap-x-4">
            {/* dt идёт первым по разметке, число визуально слева */}
            <div className="flex flex-row-reverse items-baseline justify-end gap-2">
              <dt className="text-[12px] text-muted-foreground">{text.overview.reportsOpen}</dt>
              <dd className="font-heading text-2xl font-semibold tabular-nums">{reportsOpen}</dd>
            </div>
            <div className="flex flex-row-reverse items-baseline justify-end gap-2">
              <dt className="text-[12px] text-muted-foreground">{text.overview.reportsResolved}</dt>
              <dd className="font-heading text-2xl font-semibold text-success tabular-nums">
                {reportsResolved}
              </dd>
            </div>
          </dl>
        </>
      )}
    </section>
  )
}

/** Белая карточка выбранного города (оверлей справа, §10.4): воздух сейчас и за 30 дней, листание городов. */
export function TownCard({
  town,
  districtName,
  reading,
  summary,
  index,
  total,
  onPrev,
  onNext,
  onZoom,
  className,
}: {
  town: MapTown
  districtName: string | undefined
  reading: AirReading | undefined
  summary: PointSummary | undefined
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
  onZoom: () => void
  className?: string
}) {
  const category = aqiCategory(reading?.us_aqi)
  const pm25 = air.chart.unit
  const norm = pollutants.find((p) => p.key === "pm2_5")!.norm
  const worst = summary?.worst
  const navButton =
    "grid size-9 cursor-pointer place-items-center rounded-md border border-input hover:bg-muted"

  return (
    <section
      aria-label={town.name}
      className={cn("light rounded-xl bg-background p-5 text-foreground shadow-lg", className)}
    >
      <div className="flex items-center justify-between gap-3 text-[13px]">
        {category ? (
          <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: category.color }}>
            <span aria-hidden="true" className="size-2 rounded-full" style={{ background: category.color }} />
            <span className="first-letter:uppercase">{category.label}</span> воздух
          </span>
        ) : (
          <span className="text-muted-foreground">{text.card.noData}</span>
        )}
        <span className="text-muted-foreground tabular-nums">
          {index + 1} / {total}
        </span>
      </div>

      <h3 className="mt-2 font-heading text-[28px] leading-tight font-semibold tracking-[-0.03em]">
        {town.name}
      </h3>

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-[13px]">
        {districtName && (
          <>
            <dt className="text-muted-foreground">{text.card.district}</dt>
            <dd>{districtName}</dd>
          </>
        )}
        {reading && (
          <>
            <dt className="text-muted-foreground">AQI</dt>
            <dd className="font-medium tabular-nums">{Math.round(reading.us_aqi ?? 0)}</dd>
            <dt className="text-muted-foreground">{text.card.now}</dt>
            <dd className="tabular-nums">
              PM2.5 {formatNumber(reading.pm2_5 ?? 0, 1)} · PM10 {formatNumber(reading.pm10 ?? 0, 1)} · NO₂{" "}
              {formatNumber(reading.no2 ?? 0, 1)} · SO₂ {formatNumber(reading.so2 ?? 0, 1)}
            </dd>
          </>
        )}
      </dl>

      {summary && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[13px]">{text.card.days30}</span>
            <span
              className="font-heading text-2xl font-semibold tabular-nums"
              style={{ color: summary.daysOver ? levelColor.high : levelColor.ok }}
            >
              {summary.daysOver}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(summary.daysOver / Math.max(summary.daysTotal, 1)) * 100}%`,
                background: levelColor.high,
              }}
            />
          </div>
          <p className="mt-2 text-[12px] text-muted-foreground">
            {text.card.days(summary.daysOver, summary.daysTotal)}
            {worst && (
              <>
                {" "}
                · {air.worstDay.toLowerCase()} {formatDay(worst.day)} — {formatNumber(worst.value, 1)} {pm25}
                {normLevel(worst.value, norm) !== "ok" && <>, {air.aboveNorm(worst.value, norm)}</>}
              </>
            )}
          </p>
        </div>
      )}

      <Link
        to={{ search: `?town=${encodeURIComponent(town.name)}`, hash: "#air" }}
        className="mt-4 inline-block text-[13px] font-medium text-link hover:text-link-hover"
      >
        {text.card.more} →
      </Link>

      <div className="mt-4 flex items-center gap-2">
        <button type="button" aria-label={text.card.prev} onClick={onPrev} className={navButton}>
          <ArrowLeft className="size-4" />
        </button>
        <button type="button" aria-label={text.card.next} onClick={onNext} className={navButton}>
          <ArrowRight className="size-4" />
        </button>
        <button
          type="button"
          onClick={onZoom}
          className="ml-auto h-9 cursor-pointer rounded-md border border-input px-3 text-[13px] font-medium hover:bg-muted"
        >
          {text.card.zoom}
        </button>
      </div>
    </section>
  )
}

/** Легенда и переключатели (оверлей слева снизу) */
export function MapLegend({
  toggles,
  onToggle,
  className,
}: {
  toggles: { rivers: boolean; labels: boolean; districts: boolean }
  onToggle: (key: "rivers" | "labels" | "districts") => void
  className?: string
}) {
  return (
    <section aria-label="Легенда" className={cn(panel, "text-[13px]", className)}>
      <ul className="grid gap-y-1.5">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="flex -space-x-1">
            {scaleSegments.map((c) => (
              <span
                key={c.level}
                className="size-3 rounded-full ring-2 ring-background"
                style={{ background: c.color }}
              />
            ))}
          </span>
          {text.legend.town}
        </li>
        <li className="flex items-center gap-2">
          <span className="grid size-5 place-items-center rounded-full border border-foreground/80">
            <ReportIcon category="dump" className="size-3" />
          </span>
          {text.legend.report}
        </li>
        <li className="flex items-center gap-2 text-muted-foreground">
          <span aria-hidden="true" className="w-5 text-center">
            ✕
          </span>
          {text.legend.npp}
        </li>
      </ul>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-3">
        {(["rivers", "labels", "districts"] as const).map((key) => (
          <label key={key} className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={toggles[key]}
              onChange={() => onToggle(key)}
              className="size-4 cursor-pointer accent-foreground"
            />
            {text.legend[key]}
          </label>
        ))}
      </div>
    </section>
  )
}
