import { useLatestAir } from "@/api/air"
import { air } from "@/content/air"
import { aqiCategory } from "@/lib/aqi"

type Props = { pointId: string; names: ReadonlyMap<string, string>; onSelect: (id: string) => void }

/** Текущий AQI выбранного города словами и где сейчас хуже и лучше всего — по последнему часу. */
export function AirNow({ pointId, names, onSelect }: Props) {
  const { data: latest } = useLatestAir()
  if (!latest?.size) return null

  const own = latest.get(pointId)
  const ranked = [...latest.values()].filter((r) => r.us_aqi != null).sort((a, b) => b.us_aqi! - a.us_aqi!)
  const worst = ranked[0]
  const best = ranked[ranked.length - 1]
  const ownCategory = aqiCategory(own?.us_aqi)

  const townButton = (id: string, aqi: number | undefined) => {
    const category = aqiCategory(aqi)
    return (
      <span className="inline-flex flex-wrap items-center gap-x-1.5">
        <span aria-hidden="true" className="size-2 rounded-full" style={{ background: category?.color }} />
        <button
          type="button"
          onClick={() => onSelect(id)}
          className="cursor-pointer font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
        >
          {names.get(id)}
        </button>
        <span className="tabular-nums">— {Math.round(aqi ?? 0)},</span>
        <span>{category?.label}</span>
      </span>
    )
  }

  return (
    <div className="mt-8 grid gap-6 border-y border-border py-6 md:grid-cols-[auto_1fr] md:items-center md:gap-12">
      {own && ownCategory && (
        <div className="flex items-baseline gap-4">
          <span className="font-heading text-[56px] leading-none font-semibold tracking-[-0.04em] tabular-nums">
            {Math.round(own.us_aqi ?? 0)}
          </span>
          <span>
            <span className="flex items-center gap-2 text-lg font-medium">
              <span
                aria-hidden="true"
                className="size-3 rounded-full"
                style={{ background: ownCategory.color }}
              />
              <span className="first-letter:uppercase">{ownCategory.label}</span>
            </span>
            <span className="text-[13px] text-muted-foreground">
              {air.now.title} · {names.get(pointId)} · индекс AQI
            </span>
          </span>
        </div>
      )}
      <dl className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 md:justify-self-end">
        {worst && (
          <div>
            <dt className="text-[13px]">{air.now.worst}</dt>
            <dd>{townButton(worst.point, worst.us_aqi)}</dd>
          </div>
        )}
        {best && best !== worst && (
          <div>
            <dt className="text-[13px]">{air.now.best}</dt>
            <dd>{townButton(best.point, best.us_aqi)}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}
