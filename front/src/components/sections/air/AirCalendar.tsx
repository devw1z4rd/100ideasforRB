import { useMemo, useRef, useState, type KeyboardEvent } from "react"
import { air } from "@/content/air"
import { AQI_SCALE, aqiCategory } from "@/lib/aqi"
import { buildAqiCalendar, type DailyRow, type Range } from "@/lib/airStats"
import { cn } from "@/lib/utils"

const text = air.calendar
const monthFormat = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" })
const dayFormat = new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeZone: "UTC" })
const dateOf = (day: string) => new Date(`${day}T00:00:00Z`)
const cell = "h-10 rounded-md text-sm tabular-nums"

export function AirCalendar({ rows, pointId, townName, range }: {
  rows: readonly DailyRow[]
  pointId: string
  townName: string
  range: Range
}) {
  const { from, to } = range
  const months = useMemo(() => buildAqiCalendar(rows, pointId, { from, to }), [rows, pointId, from, to])
  const days = useMemo(() => months.flatMap((month) => month.days), [months])
  const [pickedDay, setPickedDay] = useState<string>()
  const selected = days.find((entry) => entry.day === pickedDay) ?? days.findLast(({ aqi }) => aqi !== null) ?? days.at(-1)
  const container = useRef<HTMLDivElement>(null)

  function navigate(event: KeyboardEvent<HTMLButtonElement>, day: string) {
    const index = days.findIndex((entry) => entry.day === day)
    const offsets: Record<string, number | undefined> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    const offset = offsets[event.key]
    const next = event.key === "Home" ? 0 : event.key === "End" ? days.length - 1 : offset == null ? null : index + offset
    if (next == null) return
    event.preventDefault()
    const entry = days[Math.max(0, Math.min(next, days.length - 1))]
    if (!entry) return
    setPickedDay(entry.day)
    container.current?.querySelector<HTMLButtonElement>(`[data-calendar-day="${entry.day}"]`)?.focus()
  }

  return (
    <section className="mt-8">
      <h3 className="font-heading text-xl font-semibold">{text.title(townName)}</h3>
      <p className="mt-2 text-sm text-fg-secondary">{text.lead}</p>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-fg-secondary">
        {AQI_SCALE.map(({ level, label }) => (
          <li key={level} className="flex items-center gap-1.5">
            <span aria-hidden="true" data-aqi-surface={level} className="size-3 rounded-sm bg-(--surface)" />
            {label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-sm border border-dashed border-current" />
          {text.noData}
        </li>
      </ul>

      <div ref={container} className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {months.map(({ month, leadingBlanks, days: monthDays }) => (
          <section key={month} className="rounded-xl border border-border p-3 sm:p-4">
            <h4 className="text-sm font-semibold first-letter:uppercase">{monthFormat.format(dateOf(`${month}-01`))}</h4>
            <div aria-hidden="true" className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
              {text.days.map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {Array.from({ length: leadingBlanks }, (_, i) => <div aria-hidden="true" key={i} />)}
              {monthDays.map(({ day, aqi }) => {
                const category = aqiCategory(aqi)
                const active = selected?.day === day
                const summary = aqi !== null && category ? text.reading(aqi, category.label) : text.noData
                return (
                  <button
                    key={day}
                    type="button"
                    data-calendar-day={day}
                    data-aqi-surface={category?.level}
                    aria-label={`${dayFormat.format(dateOf(day))} · ${summary}`}
                    aria-pressed={active}
                    tabIndex={active ? 0 : -1}
                    onClick={() => setPickedDay(day)}
                    onKeyDown={(event) => navigate(event, day)}
                    className={cn(
                      cell,
                      "cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                      category ? "bg-(--surface) text-(--ink)" : "border border-dashed border-border text-muted-foreground",
                      active && "ring-2 ring-inset ring-current",
                    )}
                  >
                    {Number(day.slice(8))}
                  </button>
                )
              })}
            </div>
            {selected?.day.startsWith(month) && (
              <p role="status" className="mt-3 text-xs text-fg-secondary">
                {dayFormat.format(dateOf(selected.day))} · {selected.aqi === null
                  ? text.noData
                  : text.reading(selected.aqi, aqiCategory(selected.aqi)?.label ?? "")}
              </p>
            )}
          </section>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{text.note}</p>
    </section>
  )
}
