import { intlLocale, t } from "@/lib/locale"
const integerFormat = new Intl.NumberFormat(intlLocale)
const relativeFormat = new Intl.RelativeTimeFormat(intlLocale, { numeric: "auto" })

export function formatNumber(value: number, fractionDigits?: number): string {
  if (fractionDigits === undefined) return integerFormat.format(value)
  return new Intl.NumberFormat(intlLocale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000)
  if (seconds < MINUTE) return t("только что", "толькі што")
  if (seconds < HOUR) return relativeFormat.format(-Math.floor(seconds / MINUTE), "minute")
  if (seconds < DAY) return relativeFormat.format(-Math.floor(seconds / HOUR), "hour")
  return relativeFormat.format(-Math.floor(seconds / DAY), "day")
}

const dateFormat = new Intl.DateTimeFormat(intlLocale, {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

export function formatDate(day: string): string {
  return dateFormat.format(new Date(`${day}T00:00:00Z`)).replace(/\s?г\.$/, "")
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}
