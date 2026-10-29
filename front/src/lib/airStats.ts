// Расчёты секции «Воздух» (CLAUDE.md §10.6). Принцип: не прятать плохие места и дни в среднем по области —
// показывать выбранный город, разброс по всем городам и число дней выше нормы.

export type Pollutant = "pm2_5" | "pm10" | "no2" | "so2"
export type Period = "7d" | "30d" | "90d" | "ytd"

/** Суточная запись air_daily, уже с календарным днём "YYYY-MM-DD" */
export type DailyRow = { point: string; day: string; aqi_max: number } & Record<`${Pollutant}_avg`, number>

export type NormLevel = "ok" | "elevated" | "high"

const DAY_MS = 86_400_000
// Минск круглый год UTC+3 — сутки в air_daily считаются по местному времени (back/pb_hooks/lib/air.js)
const MINSK_OFFSET_MS = 3 * 3_600_000

export function minskToday(now: Date = new Date()): string {
  return new Date(now.getTime() + MINSK_OFFSET_MS).toISOString().slice(0, 10)
}

export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): string[] {
  const days: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d)
  return days
}

export type Range = { from: string; to: string }

/**
 * Период из завершённых суток: заканчивается вчера (сегодняшние сутки ещё не свёрнуты в air_daily).
 * previous — столько же дней сразу перед периодом; для «с начала года» сравнивать не с чем.
 */
export function periodRange(period: Period, today: string): { current: Range; previous: Range | null } {
  const to = addDays(today, -1)
  if (period === "ytd") return { current: { from: `${to.slice(0, 4)}-01-01`, to }, previous: null }
  const length = { "7d": 7, "30d": 30, "90d": 90 }[period]
  const from = addDays(to, -(length - 1))
  return { current: { from, to }, previous: { from: addDays(from, -length), to: addDays(from, -1) } }
}

/** Насколько значение выше нормы: до нормы, до двух норм, больше двух норм */
export function normLevel(value: number, norm: number): NormLevel {
  if (value <= norm) return "ok"
  return value <= 2 * norm ? "elevated" : "high"
}

export type SeriesPoint = {
  day: string
  /** Значение выбранного города; null — данных за день нет */
  value: number | null
  /** Разброс по всем городам за день: [минимум, максимум] и где они */
  band: [number, number] | null
  minPoint: string | null
  maxPoint: string | null
}

const key = (pollutant: Pollutant) => `${pollutant}_avg` as const

/** Ряд по дням для графика: выбранный город на фоне разброса по всем городам. */
export function buildSeries(
  rows: readonly DailyRow[],
  pollutant: Pollutant,
  point: string,
  days: readonly string[],
) {
  const byDay = new Map<string, DailyRow[]>()
  for (const r of rows) byDay.set(r.day, [...(byDay.get(r.day) ?? []), r])
  return days.map((day): SeriesPoint => {
    const dayRows = byDay.get(day) ?? []
    if (!dayRows.length) return { day, value: null, band: null, minPoint: null, maxPoint: null }
    let min = dayRows[0]
    let max = dayRows[0]
    for (const r of dayRows) {
      if (r[key(pollutant)] < min[key(pollutant)]) min = r
      if (r[key(pollutant)] > max[key(pollutant)]) max = r
    }
    const own = dayRows.find((r) => r.point === point)
    return {
      day,
      value: own ? own[key(pollutant)] : null,
      band: [min[key(pollutant)], max[key(pollutant)]],
      minPoint: min.point,
      maxPoint: max.point,
    }
  })
}

export type PointSummary = {
  /** Дней со среднесуточным значением выше нормы */
  daysOver: number
  /** Дней с данными */
  daysTotal: number
  /** Худший день периода */
  worst: { day: string; value: number } | null
}

/** Сводка по каждому городу за период: дни выше нормы и худший день. */
export function summarizeByPoint(
  rows: readonly DailyRow[],
  pollutant: Pollutant,
  norm: number,
  range: Range,
): Map<string, PointSummary> {
  const result = new Map<string, PointSummary>()
  for (const r of rows) {
    if (r.day < range.from || r.day > range.to) continue
    const value = r[key(pollutant)]
    const s = result.get(r.point) ?? { daysOver: 0, daysTotal: 0, worst: null }
    s.daysTotal++
    if (value > norm) s.daysOver++
    if (!s.worst || value > s.worst.value) s.worst = { day: r.day, value }
    result.set(r.point, s)
  }
  return result
}

/** Ближайшая точка к координатам (геолокация «рядом со мной»); равнопромежуточная проекция — для области достаточно. */
export function nearestPoint<T extends { lat: number; lon: number }>(
  points: readonly T[],
  lat: number,
  lon: number,
) {
  const cos = Math.cos((lat * Math.PI) / 180)
  let best: T | null = null
  let bestDist = Infinity
  for (const p of points) {
    const dist = (p.lat - lat) ** 2 + ((p.lon - lon) * cos) ** 2
    if (dist < bestDist) {
      best = p
      bestDist = dist
    }
  }
  return best
}
