import { useState } from "react"
import { useAirForecast } from "@/api/air"
import { Skeleton } from "@/components/ui/skeleton"
import { air } from "@/content/air"
import { AQI_SCALE, aqiCategory } from "@/lib/aqi"
import { bestWindow, forecastDays, hourRange, type ForecastDay, type ForecastSlot } from "@/lib/airHourly"
import { addDays, minskToday } from "@/lib/airStats"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

const text = air.forecast
const dayFormat = new Intl.DateTimeFormat("ru-RU", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
})
// Шкала AQI до «вредного»: выше в области почти не бывает, легенда короче
const legend = AQI_SCALE.slice(0, 4)

/**
 * «Прогноз» (CLAUDE.md §10.6, S1): почасовой AQI выбранного города на ~5 дней. Сверху — лучшее время для
 * прогулки завтра и сегодня (три часа подряд между 8 и 22 с самым низким AQI) и худший час ближайших суток;
 * ниже — сетка «сутки × часы» цветами шкалы AQI, окна для прогулки обведены, прошедшие часы бледнее.
 * Клетки появляются волной (CSS forecast-cell в index.css).
 */
export function AirForecast({ pointId, townName }: { pointId: string; townName: string }) {
  const forecast = useAirForecast(pointId)
  const [hovered, setHovered] = useState<{ day: string; hour: number } | null>(null)

  if (forecast.isPending) return <Skeleton className="mt-8 h-72 w-full rounded-xl" />
  if (forecast.isError || !forecast.data.length)
    return <p className="mt-8 text-sm text-muted-foreground">{text.empty}</p>

  const now = new Date()
  const today = minskToday(now)
  const tomorrow = addDays(today, 1)
  const nowHour = new Date(now.getTime() + 3 * 3_600_000).getUTCHours()
  const days = forecastDays(forecast.data, now)
  const todayRow = days.find((d) => d.day === today)
  const tomorrowRow = days.find((d) => d.day === tomorrow)
  const bestToday = todayRow ? bestWindow(todayRow.hours, { minHour: nowHour + 1 }) : null
  const bestTomorrow = tomorrowRow ? bestWindow(tomorrowRow.hours) : null
  const headline = bestTomorrow
    ? { day: text.tomorrow, w: bestTomorrow }
    : bestToday
      ? { day: text.today, w: bestToday }
      : null
  const headCategory = headline ? aqiCategory(headline.w.aqi) : null

  // Худший час ближайших двух суток — среди будущих часов
  const upcoming = days
    .filter((d) => d.day === today || d.day === tomorrow)
    .flatMap((d) => d.hours.flatMap((s, hour) => (s && !s.past ? [{ day: d.day, hour, s }] : [])))
  const worst = upcoming.reduce<(typeof upcoming)[number] | null>(
    (w, x) => (!w || x.s.us_aqi > w.s.us_aqi ? x : w),
    null,
  )

  const label = (day: string) =>
    day === today
      ? text.today
      : day === tomorrow
        ? text.tomorrow
        : dayFormat.format(new Date(`${day}T00:00:00Z`))
  const hoveredSlot = hovered ? days.find((d) => d.day === hovered.day)?.hours[hovered.hour] : null
  const windows: Record<string, { start: number; end: number } | null> = {
    [today]: bestToday,
    [tomorrow]: bestTomorrow,
  }

  return (
    <div className="mt-2">
      {/* Главное — словами: лучшее окно завтра (или сегодня, если завтра прогноза нет) */}
      <div className="flex flex-col gap-4 border-b border-border py-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">{text.eyebrow(townName)}</p>
          {headline && headCategory ? (
            <>
              <p className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-2">
                <span className="font-heading text-[clamp(32px,4vw,52px)] leading-none font-semibold tracking-[-0.03em]">
                  {headline.day}, {hourRange(headline.w.start, headline.w.end)}
                </span>
                <Chip color={headCategory.color}>{text.aqiUpTo(headline.w.aqi, headCategory.label)}</Chip>
              </p>
              {headline.day === text.tomorrow && (
                <p className="mt-2 text-[15px] text-fg-secondary">
                  {bestToday
                    ? text.todayWindow(hourRange(bestToday.start, bestToday.end), bestToday.aqi)
                    : text.todayNone}
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-[15px] text-fg-secondary">{text.todayNone}</p>
          )}
        </div>
        {worst && (
          <p className="max-w-[46ch] text-[13px] text-muted-foreground md:text-right lg:max-w-none lg:whitespace-nowrap">
            {text.worst(
              `${label(worst.day).toLowerCase()} ${hourRange(worst.hour, worst.hour + 1).slice(0, 5)}`,
              worst.s.us_aqi,
              aqiCategory(worst.s.us_aqi)?.label ?? "",
            )}
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="font-heading text-xl font-semibold tracking-[-0.02em]">{text.gridTitle}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{text.gridHint}</p>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
          {legend.map((c) => (
            <li key={c.level} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ background: c.color }} />
              <span className="first-letter:uppercase">{c.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 min-h-5 text-[13px] tabular-nums" aria-live="polite">
        {hovered && hoveredSlot ? (
          text.cell(
            label(hovered.day),
            hourRange(hovered.hour, hovered.hour + 1).slice(0, 5),
            hoveredSlot.us_aqi,
            aqiCategory(hoveredSlot.us_aqi)?.label ?? "",
            formatNumber(hoveredSlot.pm2_5, 1),
            hoveredSlot.past,
          )
        ) : (
          <span className="text-muted-foreground">&nbsp;</span>
        )}
      </p>

      <div className="mt-2 grid grid-cols-[76px_1fr_56px] items-center gap-x-3 gap-y-1.5 md:grid-cols-[112px_1fr_72px]">
        <span />
        <HourAxis />
        <span className="text-right text-[11px] text-muted-foreground">{text.dayMax}</span>

        {days.map((d, row) => (
          <Row
            key={d.day}
            day={d}
            row={row}
            label={label(d.day)}
            today={d.day === today}
            nowHour={nowHour}
            window={windows[d.day] ?? null}
            hovered={hovered?.day === d.day ? hovered.hour : null}
            onHover={(hour) => setHovered(hour === null ? null : { day: d.day, hour })}
          />
        ))}
      </div>

      <p className="mt-6 text-xs leading-[1.5] text-muted-foreground">{text.note}</p>
    </div>
  )
}

function Row({
  day,
  row,
  label,
  today,
  nowHour,
  window,
  hovered,
  onHover,
}: {
  day: ForecastDay
  row: number
  label: string
  today: boolean
  nowHour: number
  window: { start: number; end: number } | null
  hovered: number | null
  onHover: (hour: number | null) => void
}) {
  const future = day.hours.filter((s): s is ForecastSlot => !!s && !s.past)
  const max = future.length ? Math.max(...future.map((s) => s.us_aqi)) : null
  const maxCategory = max !== null ? aqiCategory(max) : null

  return (
    <>
      <span className={cn("truncate text-[13px]", today ? "font-semibold" : "text-muted-foreground")}>
        {label}
      </span>
      <div className="relative grid h-7 grid-cols-24 gap-px" onPointerLeave={() => onHover(null)}>
        {day.hours.map((s, hour) => (
          <span
            key={hour}
            onPointerEnter={() => s && onHover(hour)}
            className={cn(
              "forecast-cell rounded-[3px] transition-[filter,transform] duration-150",
              s && "cursor-default",
              hovered === hour && "z-10 scale-y-[1.18] brightness-110",
            )}
            style={{
              background: s ? (aqiCategory(s.us_aqi)?.color ?? "var(--muted)") : "var(--muted)",
              opacity: !s ? 0.5 : s.past ? 0.35 : 1,
              animationDelay: `${row * 70 + hour * 14}ms`,
            }}
          />
        ))}
        {/* Окно для прогулки — рамкой поверх клеток */}
        {window && (
          <span
            aria-hidden="true"
            className="forecast-window pointer-events-none absolute -inset-y-1 rounded-md ring-2 ring-foreground"
            style={{
              left: `calc(${(window.start / 24) * 100}% - 2px)`,
              width: `calc(${((window.end - window.start) / 24) * 100}% + 3px)`,
            }}
          />
        )}
        {/* Текущий час — тонкой вертикалью */}
        {today && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-y-1.5 w-0.5 rounded-full bg-foreground"
            style={{ left: `${((nowHour + 0.5) / 24) * 100}%` }}
          />
        )}
      </div>
      <span className="justify-self-end">
        {max !== null && maxCategory && (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold tabular-nums">
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ background: maxCategory.color }}
            />
            {max}
          </span>
        )}
      </span>
    </>
  )
}

function HourAxis() {
  return (
    <div className="grid grid-cols-24 text-[11px] text-muted-foreground tabular-nums">
      {Array.from({ length: 24 }, (_, h) => (
        <span key={h} className={cn(h % 3 !== 0 && "invisible", h % 6 !== 0 && "max-md:invisible")}>
          {h}
        </span>
      ))}
    </div>
  )
}

function Chip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-[13px] font-medium whitespace-nowrap">
      <span aria-hidden="true" className="size-2 rounded-full" style={{ background: color }} />
      <span className="first-letter:uppercase">{children}</span>
    </span>
  )
}
