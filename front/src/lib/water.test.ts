import { describe, expect, it } from "vitest"
import { byIndicator, exceedances, latestQuarter, quarterLabel, sections, type Reading } from "./water"

const at = { lat: 52, lon: 29 }
const rows: Reading[] = [
  {
    river: "Припять",
    post: "2,0 км ниже г. Наровля",
    section: "Припять у Наровли",
    location: at,
    indicator: "cod",
    value: 55,
    norm: 25,
    norm_type: "max",
    period: "2026-04-01 00:00:00.000Z",
    quarter: "2026-Q2",
  },
  {
    river: "Припять",
    post: "2,0 км ниже г. Наровля",
    section: "Припять у Наровли",
    location: at,
    indicator: "oxygen",
    value: 7,
    norm: 8,
    norm_type: "min",
    period: "2026-05-01 00:00:00.000Z",
    quarter: "2026-Q2",
  },
  {
    river: "Сож",
    post: "0,6 км выше г. Гомель",
    section: "Сож у Гомеля",
    location: at,
    indicator: "temperature",
    value: 0.5,
    period: "2026-05-01 00:00:00.000Z",
    quarter: "2026-Q2",
  },
  {
    river: "Днепр",
    post: "водность реки",
    indicator: "hydrology",
    period: "2026-05-01 00:00:00.000Z",
    quarter: "2026-Q2",
    note: "ниже нормы",
  },
  {
    river: "Припять",
    post: "старый",
    section: "Припять у Наровли",
    location: at,
    indicator: "cod",
    value: 90,
    norm: 25,
    norm_type: "max",
    period: "2026-02-01 00:00:00.000Z",
    quarter: "2026-Q1",
  },
]

describe("water", () => {
  it("picks the latest quarter and labels it", () => {
    expect(latestQuarter(rows)).toBe("2026-Q2")
    expect(quarterLabel("2026-Q2")).toBe("II квартал 2026")
  })

  it("rates exceedances: value/norm for maxima, norm/value for minima like oxygen", () => {
    const ex = exceedances(rows, "2026-Q2")
    expect(ex.map((e) => [e.indicator, Number(e.ratio.toFixed(2)), e.month])).toEqual([
      ["cod", 2.2, 4],
      ["oxygen", 1.14, 5],
    ])
  })

  it("groups sections with their worst ratio, including sections with only temperature notes", () => {
    const s = sections(rows, "2026-Q2")
    expect(s.map((x) => [x.name, Number(x.worst.toFixed(1)), x.exceedances.length])).toEqual([
      ["Припять у Наровли", 2.2, 2],
      ["Сож у Гомеля", 0, 0],
    ])
  })

  it("filters other indicators by quarter", () => {
    expect(byIndicator(rows, "2026-Q2", "hydrology").map((r) => r.river)).toEqual(["Днепр"])
  })
})
