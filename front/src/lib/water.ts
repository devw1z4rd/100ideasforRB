// Расчёты секции «Вода» (CLAUDE.md §10.8): последний квартал из обзоров Белгидромета, во сколько раз показатель
// хуже норматива, группировка по участкам рек.

export type Reading = {
  river: string
  post: string
  section?: string
  location?: { lat: number; lon: number } | null
  indicator: string
  value?: number
  unit?: string
  norm?: number
  norm_type?: string
  period: string
  quarter?: string
  note?: string
  /** Адрес обзора Белгидромета, из которого выписана запись */
  sourceUrl?: string
}

export type Exceedance = Reading & {
  /** Во сколько раз хуже норматива: для «не более» — значение / норма, для «не менее» (кислород) — норма / значение */
  ratio: number
  month: number
}

/** Последний квартал «2026-Q2» среди записей */
export function latestQuarter(rows: readonly Reading[]): string | null {
  return rows.reduce<string | null>(
    (max, r) => (r.quarter && (!max || r.quarter > max) ? r.quarter : max),
    null,
  )
}

/** Все кварталы с записями — от старого к новому (полка книжек) */
export function quarters(rows: readonly Reading[]): string[] {
  return [...new Set(rows.map((r) => r.quarter).filter((q): q is string => !!q))].sort()
}

export type Season = "winter" | "spring" | "summer" | "autumn"
/** Сезон квартала — цвет обложки книжки: I — зима, II — весна, III — лето, IV — осень */
export const quarterSeason = (quarter: string): Season =>
  (["winter", "spring", "summer", "autumn"] as const)[Number(quarter.split("-Q")[1]) - 1] ?? "spring"

/** «2026-Q2» → «II квартал 2026» */
export function quarterLabel(quarter: string): string {
  const [year, q] = quarter.split("-Q")
  return `${["I", "II", "III", "IV"][Number(q) - 1]} квартал ${year}`
}

/** Отклонения от нормативов качества воды за квартал, от худшего к лучшему */
export function exceedances(rows: readonly Reading[], quarter: string): Exceedance[] {
  return rows
    .filter(
      (r) => r.quarter === quarter && r.norm && r.value && (r.norm_type === "max" || r.norm_type === "min"),
    )
    .map((r) => ({
      ...r,
      ratio: r.norm_type === "max" ? r.value! / r.norm! : r.norm! / r.value!,
      month: Number(r.period.slice(5, 7)),
    }))
    .filter((r) => r.ratio > 1)
    .sort((a, b) => b.ratio - a.ratio)
}

/** Записи квартала по показателю (температура, гидрология) */
export function byIndicator(rows: readonly Reading[], quarter: string, indicator: string) {
  return rows.filter((r) => r.quarter === quarter && r.indicator === indicator)
}

export type Section = {
  name: string
  river: string
  location: { lat: number; lon: number }
  exceedances: Exceedance[]
  /** Худшее отношение к нормативу на участке; 0 — отклонений по качеству нет */
  worst: number
}

/** Участки рек с координатами (для карты): по названию участка, с отклонениями за квартал */
export function sections(rows: readonly Reading[], quarter: string): Section[] {
  const ex = exceedances(rows, quarter)
  const map = new Map<string, Section>()
  for (const r of rows) {
    if (r.quarter !== quarter || !r.section || !r.location) continue
    if (!map.has(r.section)) {
      map.set(r.section, { name: r.section, river: r.river, location: r.location, exceedances: [], worst: 0 })
    }
  }
  for (const e of ex) {
    const s = e.section ? map.get(e.section) : undefined
    if (!s) continue
    s.exceedances.push(e)
    s.worst = Math.max(s.worst, e.ratio)
  }
  return [...map.values()].sort((a, b) => b.worst - a.worst)
}
