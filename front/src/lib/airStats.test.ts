import { describe, expect, it } from "vitest"
import {
  addDays,
  buildSeries,
  daysBetween,
  minskToday,
  nearestPoint,
  normLevel,
  periodRange,
  summarizeByPoint,
  type DailyRow,
} from "./airStats"

const row = (point: string, day: string, pm2_5: number): DailyRow => ({
  point,
  day,
  aqi_max: 0,
  pm2_5_avg: pm2_5,
  pm10_avg: 0,
  no2_avg: 0,
  so2_avg: 0,
})

describe("dates", () => {
  it("uses the Minsk calendar day (UTC+3)", () => {
    expect(minskToday(new Date("2026-10-29T20:59:00Z"))).toBe("2026-10-29")
    expect(minskToday(new Date("2026-10-29T21:00:00Z"))).toBe("2026-10-30")
  })

  it("adds days across months and lists inclusive ranges", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01")
    expect(daysBetween("2026-10-30", "2026-11-01")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"])
  })
})

describe("periodRange", () => {
  it("ends yesterday and compares with the same number of days before", () => {
    expect(periodRange("7d", "2026-10-30")).toEqual({
      current: { from: "2026-10-23", to: "2026-10-29" },
      previous: { from: "2026-10-16", to: "2026-10-22" },
    })
  })

  it("starts on January 1 for year-to-date and has nothing to compare with", () => {
    expect(periodRange("ytd", "2026-10-30")).toEqual({
      current: { from: "2026-01-01", to: "2026-10-29" },
      previous: null,
    })
  })
})

describe("normLevel", () => {
  it("splits at the norm and at twice the norm", () => {
    expect(normLevel(15, 15)).toBe("ok")
    expect(normLevel(30, 15)).toBe("elevated")
    expect(normLevel(30.1, 15)).toBe("high")
  })
})

describe("buildSeries", () => {
  const rows = [
    row("gomel", "2026-10-01", 10),
    row("mozyr", "2026-10-01", 40),
    row("zhlobin", "2026-10-01", 5),
  ]

  it("keeps the selected town and the spread with the towns at both ends", () => {
    expect(buildSeries(rows, "pm2_5", "gomel", ["2026-10-01", "2026-10-02"])).toEqual([
      { day: "2026-10-01", value: 10, band: [5, 40], minPoint: "zhlobin", maxPoint: "mozyr" },
      { day: "2026-10-02", value: null, band: null, minPoint: null, maxPoint: null },
    ])
  })
})

describe("summarizeByPoint", () => {
  it("counts days above the norm and the worst day inside the range only", () => {
    const rows = [
      row("gomel", "2026-09-30", 99),
      row("gomel", "2026-10-01", 20),
      row("gomel", "2026-10-02", 10),
      row("gomel", "2026-10-03", 16),
    ]
    expect(
      summarizeByPoint(rows, "pm2_5", 15, { from: "2026-10-01", to: "2026-10-03" }).get("gomel"),
    ).toEqual({
      daysOver: 2,
      daysTotal: 3,
      worst: { day: "2026-10-01", value: 20 },
    })
  })
})

describe("nearestPoint", () => {
  it("picks the closest town", () => {
    const towns = [
      { name: "Гомель", lat: 52.4345, lon: 30.9754 },
      { name: "Мозырь", lat: 52.04162, lon: 29.21631 },
    ]
    expect(nearestPoint(towns, 52.1, 29.3)?.name).toBe("Мозырь")
    expect(nearestPoint([], 52, 30)).toBeNull()
  })
})
