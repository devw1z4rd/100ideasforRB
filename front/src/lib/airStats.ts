// Расчёты секции «Воздух» (CLAUDE.md §10.6). Принцип: не прятать плохие места и дни в среднем по области —
// показывать выбранный город, разброс по всем городам и число дней выше нормы.
import { aqiCategory, type AqiLevel } from "./aqi"

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

/** Первые сутки периода, за которые есть данные; null — данных нет. Если история загружена не с начала
 *  периода (на проде до air-backfill), график и таблица начинаются с этого дня, а не с пустоты */
export function firstDataDay(rows: readonly { day: string }[], range: Range): string | null {
  let first: string | null = null
  for (const r of rows)
    if (r.day >= range.from && r.day <= range.to && (!first || r.day < first)) first = r.day
  return first
}

/** Клетка таблицы «где и когда»: сутки или неделя (с понедельника), from–to включительно */
export type Bucket = { from: string; to: string; days: string[] }

/** Сутки — клетками, пока их не больше maxDaily; дальше — недели с понедельника: иначе клетки в 2 px и месиво */
export function buckets(days: readonly string[], maxDaily = 92): Bucket[] {
  if (days.length <= maxDaily) return days.map((d) => ({ from: d, to: d, days: [d] }))
  const out: Bucket[] = []
  for (const d of days) {
    const monday = new Date(`${d}T00:00:00Z`).getUTCDay() === 1
    const last = out[out.length - 1]
    if (!last || monday) out.push({ from: d, to: d, days: [d] })
    else {
      last.to = d
      last.days.push(d)
    }
  }
  return out
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

/** Сегодня, пока сутки не закончились: среднее выбранного города за прошедшие часы и сколько их */
export type TodayPoint = SeriesPoint & { value: number; hours: number }

/**
 * Незавершённая точка «сегодня» для графика: среднее за прошедшие часы сегодняшних минских суток по выбранному
 * городу и разброс по всем городам (по их прошедшим часам). В подсчёт дней выше нормы не входит — сутки
 * не закончились. null — у города сегодня ещё нет ни одного фактического часа.
 */
export function todayPoint(
  readings: ReadonlyArray<{ point: string } & Partial<Record<Pollutant, number>>>,
  pollutant: Pollutant,
  point: string,
  day: string,
): TodayPoint | null {
  const sums = new Map<string, { sum: number; hours: number }>()
  for (const r of readings) {
    const v = r[pollutant]
    if (v == null) continue
    const s = sums.get(r.point) ?? { sum: 0, hours: 0 }
    s.sum += v
    s.hours++
    sums.set(r.point, s)
  }
  const own = sums.get(point)
  if (!own) return null
  const avgs = [...sums].map(([p, s]) => ({ point: p, avg: s.sum / s.hours }))
  const min = avgs.reduce((m, a) => (a.avg < m.avg ? a : m))
  const max = avgs.reduce((m, a) => (a.avg > m.avg ? a : m))
  return {
    day,
    value: own.sum / own.hours,
    hours: own.hours,
    band: [min.avg, max.avg],
    minPoint: min.point,
    maxPoint: max.point,
  }
}

export type PointSummary = {
  /** Дней со среднесуточным значением выше нормы */
  daysOver: number
  /** Из них — выше двух норм */
  daysHigh: number
  /** Дней с данными */
  daysTotal: number
  /** Худший день периода */
  worst: { day: string; value: number } | null
}

/** Среднесуточные значения одного города по дням периода; null — за день нет данных. */
export function pointDays(
  rows: readonly DailyRow[],
  point: string,
  pollutant: Pollutant,
  days: readonly string[],
): Array<{ day: string; value: number | null }> {
  const byDay = new Map<string, number>()
  for (const r of rows) if (r.point === point) byDay.set(r.day, r[key(pollutant)])
  return days.map((day) => ({ day, value: byDay.get(day) ?? null }))
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
    const s = result.get(r.point) ?? { daysOver: 0, daysHigh: 0, daysTotal: 0, worst: null }
    s.daysTotal++
    if (value > norm) s.daysOver++
    if (value > 2 * norm) s.daysHigh++
    if (!s.worst || value > s.worst.value) s.worst = { day: r.day, value }
    result.set(r.point, s)
  }
  return result
}

/**
 * Дни одного города за период по категории AQI худшего часа суток (aqi_max): «хороший весь день» — max ≤ 50.
 * counts — только встретившиеся категории.
 */
export function aqiDayCounts(
  rows: readonly DailyRow[],
  point: string,
  range: Range,
): { total: number; counts: Partial<Record<AqiLevel, number>> } {
  const counts: Partial<Record<AqiLevel, number>> = {}
  let total = 0
  for (const r of rows) {
    if (r.point !== point || r.day < range.from || r.day > range.to) continue
    const level = aqiCategory(r.aqi_max)?.level
    if (!level) continue
    counts[level] = (counts[level] ?? 0) + 1
    total++
  }
  return { total, counts }
}

/**
 * В каких пределах был AQI города за период: самый спокойный и самый тяжёлый из «худших часов» суток
 * (air_daily.aqi_max). Для скобки на шкале AQI в сводке; null — данных за период нет.
 */
export function aqiRange(
  rows: readonly DailyRow[],
  point: string,
  range: Range,
): { min: number; max: number; days: number } | null {
  let min = Infinity
  let max = -Infinity
  let days = 0
  for (const r of rows) {
    if (r.point !== point || r.day < range.from || r.day > range.to) continue
    min = Math.min(min, r.aqi_max)
    max = Math.max(max, r.aqi_max)
    days++
  }
  return days ? { min, max, days } : null
}

/** Сводка по каждому городу сразу по всем показателям — для таблицы городов. */
export function summarizeAll(
  rows: readonly DailyRow[],
  norms: ReadonlyArray<{ key: Pollutant; norm: number }>,
  range: Range,
): Map<string, Partial<Record<Pollutant, PointSummary>>> {
  const result = new Map<string, Partial<Record<Pollutant, PointSummary>>>()
  for (const { key: pollutant, norm } of norms) {
    for (const [point, summary] of summarizeByPoint(rows, pollutant, norm, range)) {
      result.set(point, { ...result.get(point), [pollutant]: summary })
    }
  }
  return result
}

export type TownSortKey = Pollutant | "name" | "aqi"
export type SortDir = "asc" | "desc"

export type TownRow = {
  id: string
  name: string
  /** AQI сейчас; null — нет свежего значения */
  aqi: number | null
  summary: Partial<Record<Pollutant, PointSummary>>
}

/**
 * Порядок строк таблицы городов. По показателю — дни выше нормы, при равенстве худшие сутки;
 * по AQI — текущее значение (без данных — в конце); по городу — алфавит. Равные — по алфавиту.
 */
export function sortTowns(towns: readonly TownRow[], key: TownSortKey, dir: SortDir): TownRow[] {
  const byName = (a: TownRow, b: TownRow) => a.name.localeCompare(b.name, "ru")
  const primary = (a: TownRow, b: TownRow): number => {
    if (key === "name") return byName(a, b)
    if (key === "aqi") {
      if (a.aqi == null || b.aqi == null) return 0
      return a.aqi - b.aqi
    }
    const x = a.summary[key]
    const y = b.summary[key]
    return (x?.daysOver ?? -1) - (y?.daysOver ?? -1) || (x?.worst?.value ?? -1) - (y?.worst?.value ?? -1)
  }
  const sign = dir === "asc" ? 1 : -1
  return [...towns].sort((a, b) => {
    // Без текущего AQI — всегда внизу, в какую сторону ни сортируй
    if (key === "aqi" && (a.aqi == null) !== (b.aqi == null)) return a.aqi == null ? 1 : -1
    return sign * primary(a, b) || byName(a, b)
  })
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
