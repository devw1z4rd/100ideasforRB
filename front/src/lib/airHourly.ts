// Time in the database is UTC; days and hours are shown in Minsk time (UTC+3 all year).
import type { Pollutant } from "./airStats"
import { normLevel } from "./airStats"

const MINSK_OFFSET_MS = 3 * 3_600_000

export type HourlyRow = {
  ts: string
  us_aqi: number
  pm2_5: number
  pm10: number
  no2: number
  so2: number
}

export function minskHour(ts: string): { day: string; hour: number } {
  const local = new Date(Date.parse(ts.replace(" ", "T")) + MINSK_OFFSET_MS)
  return { day: local.toISOString().slice(0, 10), hour: local.getUTCHours() }
}

export const minskDayStart = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) - MINSK_OFFSET_MS)

export type ForecastSlot = HourlyRow & { past: boolean }
export type ForecastDay = { day: string; hours: Array<ForecastSlot | null> }

export function forecastDays(rows: readonly HourlyRow[], now: Date): ForecastDay[] {
  const byDay = new Map<string, Array<ForecastSlot | null>>()
  for (const r of rows) {
    const { day, hour } = minskHour(r.ts)
    const hours = byDay.get(day) ?? Array<ForecastSlot | null>(24).fill(null)
    hours[hour] = { ...r, past: Date.parse(r.ts.replace(" ", "T")) <= now.getTime() }
    byDay.set(day, hours)
  }
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, hours]) => ({ day, hours }))
}

export function bestWindow(
  hours: ReadonlyArray<{ us_aqi: number } | null>,
  {
    from = 8,
    to = 22,
    len = 3,
    minHour = 0,
  }: { from?: number; to?: number; len?: number; minHour?: number } = {},
): { start: number; end: number; aqi: number } | null {
  let best: { start: number; end: number; aqi: number } | null = null
  for (let start = Math.max(from, minHour); start + len <= to; start++) {
    const slots = hours.slice(start, start + len)
    if (slots.length < len || slots.some((s) => !s)) continue
    const aqi = Math.max(...slots.map((s) => s!.us_aqi))
    if (!best || aqi < best.aqi) best = { start, end: start + len, aqi }
  }
  return best
}

export type DayFilter = "all" | "weekdays" | "weekends"

export type HourStat = {
  hour: number
  mean: number | null
  over: number
  total: number
}

export function hourProfile(
  rows: readonly HourlyRow[],
  pollutant: Pollutant,
  norm: number,
  filter: DayFilter = "all",
): HourStat[] {
  const sum = Array<number>(24).fill(0)
  const stats = Array.from({ length: 24 }, (_, hour): HourStat => ({ hour, mean: null, over: 0, total: 0 }))
  for (const r of rows) {
    const { day, hour } = minskHour(r.ts)
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay()
    const weekend = weekday === 0 || weekday === 6
    if ((filter === "weekdays" && weekend) || (filter === "weekends" && !weekend)) continue
    const v = r[pollutant]
    sum[hour] += v
    stats[hour].total++
    if (normLevel(v, norm) !== "ok") stats[hour].over++
  }
  for (const s of stats) if (s.total) s.mean = sum[s.hour] / s.total
  return stats
}

export function profileExtremes(
  profile: readonly HourStat[],
  len = 3,
): { worst: { start: number; mean: number }; best: { start: number; mean: number } } | null {
  if (profile.some((s) => s.mean === null)) return null
  const windows = profile.map((_, start) => ({
    start,
    mean:
      Array.from({ length: len }, (_, k) => profile[(start + k) % 24].mean!).reduce((a, b) => a + b, 0) / len,
  }))
  const worst = windows.reduce((a, b) => (b.mean > a.mean ? b : a))
  const best = windows.reduce((a, b) => (b.mean < a.mean ? b : a))
  return { worst, best }
}

export const hourRange = (start: number, end: number) =>
  `${String(start % 24).padStart(2, "0")}:00–${String(end % 24).padStart(2, "0")}:00`
