import { minskDay } from "@/api/dates"
import type { Period, Pollutant, Range } from "./airStats"
import { districtAt, type PolygonGeometry } from "./geo"

export type RankMetric = Pollutant | "reports"

// Gomel district has no air point of its own: its center is Gomel city.
export const GOMEL_DISTRICT = "Гомельский"
export const GOMEL_TOWN = "Гомель"

export function districtPoints(
  districts: readonly { id: string; name: string }[],
  points: readonly { id: string; name: string; district?: string }[],
): Map<string, string> {
  const byDistrict = new Map(points.filter((p) => p.district).map((p) => [p.district!, p.id]))
  const gomel = points.find((p) => p.name === GOMEL_TOWN)?.id
  const result = new Map<string, string>()
  for (const d of districts) {
    const point = byDistrict.get(d.id) ?? (d.name === GOMEL_DISTRICT ? gomel : undefined)
    if (point) result.set(d.id, point)
  }
  return result
}

export function perDistrict<T>(
  perPoint: ReadonlyMap<string, T>,
  points: ReadonlyMap<string, string>,
): Map<string, T> {
  const result = new Map<string, T>()
  for (const [district, point] of points) {
    const value = perPoint.get(point)
    if (value !== undefined) result.set(district, value)
  }
  return result
}

export type Ranked = { id: string; value: number; rank: number }

export function rankDesc(values: ReadonlyMap<string, number>, names: ReadonlyMap<string, string>): Ranked[] {
  const sorted = [...values]
    .sort(([a, x], [b, y]) => y - x || (names.get(a) ?? "").localeCompare(names.get(b) ?? "", "ru"))
    .map(([id, value]) => ({ id, value, rank: 0 }))
  sorted.forEach((r, i) => {
    r.rank = i > 0 && sorted[i - 1].value === r.value ? sorted[i - 1].rank : i + 1
  })
  return sorted
}

export type ReportCounts = { total: number; open: number; resolved: number }

export function countReports(
  reports: readonly { district?: string; created: string; status: string }[],
  range: Range,
): Map<string, ReportCounts> {
  const result = new Map<string, ReportCounts>()
  for (const r of reports) {
    if (!r.district) continue
    const day = minskDay(r.created)
    if (day < range.from || day > range.to) continue
    const c = result.get(r.district) ?? { total: 0, open: 0, resolved: 0 }
    if (r.status === "accepted" || r.status === "forwarded") c.open++
    else if (r.status === "resolved") c.resolved++
    else continue
    c.total++
    result.set(r.district, c)
  }
  return result
}

export function groupByDistrict<T>(
  items: readonly T[],
  locate: (item: T) => { lat: number; lon: number },
  districts: readonly { id: string; geometry?: PolygonGeometry | null }[],
): Map<string, T[]> {
  const result = new Map<string, T[]>()
  for (const item of items) {
    const { lat, lon } = locate(item)
    const id = districtAt(districts, lon, lat)
    if (id) result.set(id, [...(result.get(id) ?? []), item])
  }
  return result
}

export type CompareState = { metric: RankMetric; period: Period; a: string; b: string }

const METRICS: readonly RankMetric[] = ["pm2_5", "pm10", "no2", "so2", "reports"]

export function readCompareParams(
  params: URLSearchParams,
  names: readonly string[],
  defaults: CompareState,
  periods: readonly Period[],
): CompareState {
  const metric = METRICS.find((m) => m === params.get("m")) ?? defaults.metric
  const period = periods.find((p) => p === params.get("p")) ?? defaults.period
  const pick = (value: string | null, fallback: string) =>
    value && names.includes(value) ? value : names.includes(fallback) ? fallback : (names[0] ?? "")
  const a = pick(params.get("a"), defaults.a)
  let b = pick(params.get("b"), defaults.b)
  if (b === a) b = names.find((n) => n !== a) ?? a
  return { metric, period, a, b }
}
