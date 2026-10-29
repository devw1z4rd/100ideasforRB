import { describe, expect, it } from "vitest"
import {
  change,
  compositionForYear,
  countryMobile,
  emissionYears,
  mobileFor,
  regionSeries,
  regionsForYear,
  type Stat,
} from "./emissions"

const rows: Stat[] = [
  { territory: "Республика Беларусь", year: 2025, indicator: "generated", value: 2183.453 },
  { territory: "Республика Беларусь", year: 2025, indicator: "captured", value: 1784.675 },
  { territory: "Гомельская область", year: 2025, indicator: "generated", value: 415.024 },
  { territory: "Гомельская область", year: 2025, indicator: "captured", value: 335.13 },
  { territory: "Витебская область", year: 2025, indicator: "generated", value: 298.761 },
  { territory: "Витебская область", year: 2025, indicator: "captured", value: 215.278 },
  { territory: "Гомельская область", year: 2024, indicator: "generated", value: 478.849 },
  { territory: "Гомельская область", year: 2024, indicator: "captured", value: 383.772 },
  { territory: "Республика Беларусь", year: 2024, indicator: "generated", value: 2492.445 },
  { territory: "Республика Беларусь", year: 2024, indicator: "captured", value: 2048.674 },
  { territory: "Гомельская область", year: 2025, indicator: "mobile", value: 43 },
  {
    territory: "Республика Беларусь",
    year: 2025,
    indicator: "mobile",
    pollutant: "оксид углерода",
    value: 297.3,
  },
  {
    territory: "Республика Беларусь",
    year: 2025,
    indicator: "mobile",
    pollutant: "диоксид азота",
    value: 106.5,
  },
  {
    territory: "Республика Беларусь",
    year: 2025,
    indicator: "stationary",
    pollutant: "диоксид серы",
    value: 26.032,
  },
  {
    territory: "Республика Беларусь",
    year: 2025,
    indicator: "stationary",
    pollutant: "метан",
    value: 157.626,
  },
]

describe("regionsForYear", () => {
  it("computes emissions as generated minus captured, matching the published figures", () => {
    const { country, regions } = regionsForYear(rows, 2025)
    expect(country.emitted).toBeCloseTo(398.778, 3)
    const gomel = regions.find((r) => r.territory === "Гомельская область")!
    expect(gomel.emitted).toBeCloseTo(79.894, 3)
    expect(gomel.capturedShare).toBeCloseTo(80.75, 1)
  })

  it("ranks regions by emissions with country shares and a running total", () => {
    const { regions } = regionsForYear(rows, 2025)
    expect(regions.map((r) => [r.territory, r.rank])).toEqual([
      ["Витебская область", 1],
      ["Гомельская область", 2],
    ])
    expect(regions[0].countryShare).toBeCloseTo(20.94, 1)
    expect(regions[1].cumulative).toBeCloseTo(regions[0].countryShare + regions[1].countryShare, 6)
  })
})

describe("series and helpers", () => {
  it("lists only years that have both generated and captured", () => {
    expect(emissionYears(rows)).toEqual([2024, 2025])
  })

  it("builds a yearly series for a region", () => {
    expect(regionSeries(rows, "Гомельская область").map((p) => Math.round(p.emitted * 10) / 10)).toEqual([
      95.1, 79.9,
    ])
  })

  it("returns percentage change or null", () => {
    expect(change(80, 100)).toBe(-20)
    expect(change(80, undefined)).toBeNull()
    expect(change(80, 0)).toBeNull()
  })

  it("reads transport emissions and the national composition", () => {
    expect(mobileFor(rows, "Гомельская область", 2025)).toBe(43)
    expect(mobileFor(rows, "Гомельская область", 2023)).toBeNull()
    expect(compositionForYear(rows, 2025).map((c) => c.pollutant)).toEqual(["метан", "диоксид серы"])
    expect(countryMobile(rows, 2025)).toBeCloseTo(403.8, 6)
    expect(countryMobile(rows, 2024)).toBeNull()
  })
})
