// Даты PocketBase: "2026-10-29 19:40:11.826Z" — UTC, через пробел. Safari такую строку в Date не разбирает.

/** Date из date-поля PocketBase; пустая строка или мусор — null. */
export function parsePbDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value.replace(" ", "T"))
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Календарный день "YYYY-MM-DD" из даты, где PocketBase хранит день полуночью UTC (air_daily.date, water_readings.period).
 * Часовой пояс браузера не влияет.
 */
export function pbDay(value: string): string {
  return value.slice(0, 10)
}
