import { intlLocale } from "@/lib/locale"
import type { NormLevel } from "@/lib/airStats"

const dayFormat = new Intl.DateTimeFormat(intlLocale, { day: "numeric", month: "short", timeZone: "UTC" })
const dayLongFormat = new Intl.DateTimeFormat(intlLocale, { day: "numeric", month: "long", timeZone: "UTC" })

export const formatDay = (day: string) => dayFormat.format(new Date(`${day}T00:00:00Z`))
export const formatDayLong = (day: string) => dayLongFormat.format(new Date(`${day}T00:00:00Z`))

export const levelColor: Record<NormLevel, string> = {
  ok: "var(--level-ok)",
  elevated: "var(--level-elevated)",
  high: "var(--level-high)",
}
