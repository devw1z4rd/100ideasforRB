import { useState } from "react"
import { compare as text, districtLabel, metrics, type MetricInfo } from "@/content/compare"
import type { Ranked, RankMetric } from "@/lib/compare"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { DistrictMap, type MapDot, type MapLabel, type MapShape } from "./DistrictMap"

type Props = {
  metric: MetricInfo
  ranked: readonly Ranked[]
  /** Районы без значения — внизу списка, на карте серые */
  missing: readonly string[]
  names: ReadonlyMap<string, string>
  /** Дней в периоде с данными — для «18 дн. из 90» */
  daysTotal: ReadonlyMap<string, number>
  periodShort: string
  map: { width: number; height: number; shapes: readonly MapShape[]; dots: readonly MapDot[] }
  labels: readonly MapLabel[]
  a: string
  b: string
  onSelect: (id: string) => void
}

const chip =
  "h-8 cursor-pointer rounded-full border px-3.5 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

// Последовательная шкала одного тона: 0 — едва заметный оттенок, максимум — полный --destructive
const ramp = (share: number) =>
  `color-mix(in oklab, var(--destructive) ${Math.round(8 + 92 * share)}%, var(--background))`

/** Выбор показателя — чипами; видны и пока данные грузятся */
export function MetricChips({ value, onChange }: { value: RankMetric; onChange: (m: RankMetric) => void }) {
  return (
    <div role="radiogroup" aria-label={text.ranking.metricLabel} className="flex flex-wrap gap-2">
      {metrics.map((m) => (
        <button
          key={m.key}
          type="button"
          role="radio"
          aria-checked={value === m.key}
          onClick={() => onChange(m.key)}
          className={cn(
            chip,
            value === m.key
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input text-muted-foreground hover:text-foreground",
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}

/** Группа районов с одинаковым значением: «Мозырский район, Речицкий район и ещё 2» */
function groupNames(group: readonly Ranked[], names: ReadonlyMap<string, string>) {
  const shown = group.slice(0, 2).map((r) => districtLabel(names.get(r.id) ?? ""))
  return group.length > 2 ? `${shown.join(", ")} и ещё ${group.length - 2}` : shown.join(" и ")
}

/**
 * Районы по одному показателю: картограмма + список от большего к меньшему. Наведение связывает карту и список,
 * клик ставит район вторым в сравнение ниже.
 */
export function DistrictRanking({
  metric,
  ranked,
  missing,
  names,
  daysTotal,
  periodShort,
  map,
  labels,
  a,
  b,
  onSelect,
}: Props) {
  const [hovered, setHovered] = useState<string | null>(null)
  const max = ranked[0]?.value ?? 0
  const values = new Map(ranked.map((r) => [r.id, r]))
  const fill = (id: string) => {
    const r = values.get(id)
    return r ? ramp(max > 0 ? r.value / max : 0) : "var(--muted)"
  }
  const isAir = metric.key !== "reports"
  const valueText = (r: Ranked) =>
    isAir && daysTotal.get(r.id)
      ? `${text.ranking.value(metric, r.value)} ${text.ranking.of(daysTotal.get(r.id)!)}`
      : text.ranking.value(metric, r.value)

  const top = ranked.filter((r) => r.value === max)
  const minValue = ranked.at(-1)?.value ?? 0
  const bottom = ranked.filter((r) => r.value === minValue)

  return (
    <div>
      {/* Вывод словами — до картинки: кто чаще всех и кто реже */}
      <p className="max-w-[70ch] font-heading text-[clamp(20px,2vw,24px)] leading-snug font-semibold tracking-[-0.02em] text-balance">
        {max === 0 ? (
          text.ranking.none(metric, periodShort)
        ) : (
          <>
            {text.ranking.most(metric)} — {groupNames(top, names)}: {valueText(top[0])}.{" "}
            {minValue < max && (
              <span className="text-muted-foreground">
                {isAir ? text.ranking.least : text.ranking.leastReports} — {groupNames(bottom, names)}:{" "}
                {valueText(bottom[0])}.
              </span>
            )}
          </>
        )}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
        <figure className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
          <DistrictMap
            {...map}
            dots={isAir ? map.dots : []}
            labels={labels}
            fill={fill}
            a={a}
            b={b}
            hovered={hovered}
            onHover={setHovered}
            onSelect={onSelect}
            ariaLabel={text.ranking.mapLabel(metric)}
            tooltip={(id) => {
              const r = values.get(id)
              return (
                <>
                  <span className="font-semibold">{districtLabel(names.get(id) ?? "")}</span>
                  <br />
                  {r ? (
                    <span className="tabular-nums">
                      {valueText(r)} · {metric.caption}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{text.ranking.noData}</span>
                  )}
                </>
              )
            }}
          />
          <figcaption className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
            {/* Когда у всех 0, шкала «0 — 0» ничего не объясняет */}
            {max > 0 && (
              <span className="inline-flex items-center gap-2 tabular-nums">
                0
                <span
                  aria-hidden="true"
                  className="h-2.5 w-28 rounded-sm"
                  style={{ background: `linear-gradient(to right, ${ramp(0)}, ${ramp(1)})` }}
                />
                {formatNumber(max)} · {metric.caption}
              </span>
            )}
            {missing.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2.5 rounded-sm bg-muted" />
                {text.ranking.noData}
              </span>
            )}
            {isAir && (
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2.5 rounded-full border-[1.5px] border-foreground" />
                {text.ranking.legendTown}
              </span>
            )}
            <span>{text.ranking.attribution}</span>
          </figcaption>
        </figure>

        <div>
          <p className="text-[13px] text-muted-foreground">
            {text.ranking.hint(districtLabel(names.get(a) ?? ""))}{" "}
            <a href="#pair" className="font-medium text-link hover:text-link-hover">
              {text.ranking.toPair}
            </a>
          </p>
          <ol className="mt-3" onPointerLeave={() => setHovered(null)}>
            {ranked.map((r) => (
              <RankRow
                key={r.id}
                id={r.id}
                rank={r.rank}
                name={names.get(r.id) ?? ""}
                value={text.ranking.value(metric, r.value)}
                share={max > 0 ? r.value / max : 0}
                role={r.id === a ? "a" : r.id === b ? "b" : null}
                hovered={hovered === r.id}
                onHover={setHovered}
                onSelect={onSelect}
              />
            ))}
            {missing.map((id) => (
              <RankRow
                key={id}
                id={id}
                rank={null}
                name={names.get(id) ?? ""}
                value={text.ranking.noData}
                share={0}
                role={id === a ? "a" : id === b ? "b" : null}
                hovered={hovered === id}
                onHover={setHovered}
                onSelect={onSelect}
              />
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

type RowProps = {
  id: string
  rank: number | null
  name: string
  value: string
  share: number
  role: "a" | "b" | null
  hovered: boolean
  onHover: (id: string) => void
  onSelect: (id: string) => void
}

function RankRow({ id, rank, name, value, share, role, hovered, onHover, onSelect }: RowProps) {
  const color = role === "a" ? "var(--compare-a)" : role === "b" ? "var(--compare-b)" : undefined
  return (
    <li>
      <button
        type="button"
        aria-pressed={role === "b"}
        onClick={() => onSelect(id)}
        onPointerEnter={() => onHover(id)}
        onFocus={() => onHover(id)}
        className={cn(
          "grid w-full grid-cols-[24px_minmax(0,1fr)_minmax(0,0.9fr)_72px] items-center gap-x-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring",
          role !== "a" && "cursor-pointer",
          hovered && "bg-muted",
        )}
      >
        <span className="text-[13px] text-muted-foreground tabular-nums">{rank ?? "—"}</span>
        <span className={cn("inline-flex min-w-0 items-center gap-2", role && "font-semibold")}>
          {color && (
            <span aria-hidden="true" className="size-2.5 shrink-0 rounded-sm" style={{ background: color }} />
          )}
          <span className="truncate">{districtLabel(name)}</span>
        </span>
        <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-[2px] bg-muted">
          <span
            className="block h-full rounded-[2px] transition-[width] duration-300"
            style={{
              width: `${share * 100}%`,
              background: color ?? "color-mix(in oklab, var(--foreground) 35%, transparent)",
            }}
          />
        </span>
        <span className={cn("text-right tabular-nums", role ? "font-semibold" : "text-muted-foreground")}>
          {value}
        </span>
      </button>
    </li>
  )
}
