export type Stat = { territory: string; year: number; indicator: string; pollutant?: string; value: number }

export const COUNTRY = "Республика Беларусь"

export type RegionYear = {
  territory: string
  generated: number
  captured: number
  emitted: number
  capturedShare: number
  countryShare: number
  cumulative: number
  rank: number
}

const totals = (rows: readonly Stat[], indicator: string, year: number) =>
  new Map(
    rows
      .filter((r) => r.indicator === indicator && r.year === year && !r.pollutant)
      .map((r) => [r.territory, r.value]),
  )

export function emissionYears(rows: readonly Stat[]): number[] {
  const gen = new Set(rows.filter((r) => r.indicator === "generated").map((r) => r.year))
  return [
    ...new Set(rows.filter((r) => r.indicator === "captured" && gen.has(r.year)).map((r) => r.year)),
  ].sort()
}

export function regionsForYear(rows: readonly Stat[], year: number) {
  const gen = totals(rows, "generated", year)
  const cap = totals(rows, "captured", year)
  const make = (territory: string) => {
    const generated = gen.get(territory) ?? 0
    const captured = cap.get(territory) ?? 0
    return { territory, generated, captured, emitted: generated - captured }
  }
  const country = make(COUNTRY)
  let cumulative = 0
  const regions: RegionYear[] = [...gen.keys()]
    .filter((t) => t !== COUNTRY && cap.has(t))
    .map(make)
    .sort((a, b) => b.emitted - a.emitted)
    .map((r, i) => {
      const countryShare = country.emitted ? (r.emitted / country.emitted) * 100 : 0
      cumulative += countryShare
      return {
        ...r,
        capturedShare: r.generated ? (r.captured / r.generated) * 100 : 0,
        countryShare,
        cumulative,
        rank: i + 1,
      }
    })
  return { country, regions }
}

export function regionSeries(rows: readonly Stat[], territory: string) {
  return emissionYears(rows).map((year) => {
    const r = regionsForYear(rows, year)
    const region = territory === COUNTRY ? r.country : r.regions.find((x) => x.territory === territory)
    return { year, emitted: region?.emitted ?? 0, rank: region && "rank" in region ? region.rank : null }
  })
}

export function change(now: number | undefined, before: number | undefined): number | null {
  if (now == null || before == null || before === 0) return null
  return ((now - before) / before) * 100
}

export function mobileFor(rows: readonly Stat[], territory: string, year: number): number | null {
  return (
    rows.find((r) => r.indicator === "mobile" && r.territory === territory && r.year === year && !r.pollutant)
      ?.value ?? null
  )
}

export function compositionForYear(rows: readonly Stat[], year: number) {
  return rows
    .filter((r) => r.indicator === "stationary" && r.year === year && r.territory === COUNTRY && r.pollutant)
    .map((r) => ({ pollutant: r.pollutant!, value: r.value }))
    .sort((a, b) => b.value - a.value)
}

export function countryMobile(rows: readonly Stat[], year: number): number | null {
  const parts = rows.filter(
    (r) => r.indicator === "mobile" && r.year === year && r.territory === COUNTRY && r.pollutant,
  )
  return parts.length ? parts.reduce((sum, r) => sum + r.value, 0) : null
}

export function compositionShares(rows: readonly Stat[], year: number, total: number) {
  const items = compositionForYear(rows, year).map((c) => ({
    ...c,
    share: total ? (c.value / total) * 100 : 0,
  }))
  const rest = total - items.reduce((sum, c) => sum + c.value, 0)
  return { items, other: total && rest > 0.05 ? { value: rest, share: (rest / total) * 100 } : null }
}
