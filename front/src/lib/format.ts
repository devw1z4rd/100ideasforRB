// Форматирование для интерфейса на русском (CLAUDE.md §10.1: цифры — tabular-nums, разряды не разрываются)

const integerFormat = new Intl.NumberFormat("ru-RU")
const relativeFormat = new Intl.RelativeTimeFormat("ru", { numeric: "auto" })

/** Число по-русски: «1 316 666» (неразрывные пробелы), «40,4». fractionDigits фиксирует знаки после запятой. */
export function formatNumber(value: number, fractionDigits?: number): string {
  if (fractionDigits === undefined) return integerFormat.format(value)
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Давность для подписей вида «Обновлено 14 минут назад»: «только что», «N минут/часов назад», «вчера», «N дней назад».
 * Время из будущего (рассинхрон часов клиента и сервера) считается «только что».
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000)
  if (seconds < MINUTE) return "только что"
  if (seconds < HOUR) return relativeFormat.format(-Math.floor(seconds / MINUTE), "minute")
  if (seconds < DAY) return relativeFormat.format(-Math.floor(seconds / HOUR), "hour")
  return relativeFormat.format(-Math.floor(seconds / DAY), "day")
}

// Календарный день "YYYY-MM-DD" форматируем в UTC, чтобы часовой пояс браузера не сдвинул дату
const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

/** «26 октября 2026» из "2026-10-26" (без « г.») */
export function formatDate(day: string): string {
  return dateFormat.format(new Date(`${day}T00:00:00Z`)).replace(/\s?г\.$/, "")
}

/** Домен источника для подписи: «belgidromet.by»; не URL — строка как есть */
export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}
