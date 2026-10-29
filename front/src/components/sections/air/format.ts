import type { NormLevel } from "@/lib/airStats"

// Дни — календарные "YYYY-MM-DD"; форматируем в UTC, чтобы часовой пояс браузера не сдвинул дату
const dayFormat = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" })
const dayLongFormat = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" })

/** «14 окт.» */
export const formatDay = (day: string) => dayFormat.format(new Date(`${day}T00:00:00Z`))
/** «14 октября» */
export const formatDayLong = (day: string) => dayLongFormat.format(new Date(`${day}T00:00:00Z`))

export const levelColor: Record<NormLevel, string> = {
  ok: "var(--level-ok)",
  elevated: "var(--level-elevated)",
  high: "var(--level-high)",
}
