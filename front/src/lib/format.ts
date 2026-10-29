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
