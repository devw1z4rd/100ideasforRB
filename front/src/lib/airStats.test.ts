import { describe, expect, it } from "vitest"
import {
  addDays,
  aqiDayCounts,
  aqiRange,
  buckets,
  firstDataDay,
  buildSeries,
  daysBetween,
  minskToday,
  nearestPoint,
  normLevel,
  periodRange,
  pointDays,
  sortTowns,
  todayPoint,
  summarizeAll,
  summarizeByPoint,
  type DailyRow,
  type TownRow,
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
      row("gomel", "2026-10-04", 31),
    ]
    expect(
      summarizeByPoint(rows, "pm2_5", 15, { from: "2026-10-01", to: "2026-10-04" }).get("gomel"),
    ).toEqual({
      daysOver: 3,
      daysHigh: 1,
      daysTotal: 4,
      worst: { day: "2026-10-04", value: 31 },
    })
  })
})

describe("aqiDayCounts", () => {
  it("counts days of one town by the AQI category of the worst hour, inside the range only", () => {
    const rows: DailyRow[] = [
      { ...row("gomel", "2026-09-30", 0), aqi_max: 180 },
      { ...row("gomel", "2026-10-01", 0), aqi_max: 30 },
      { ...row("gomel", "2026-10-02", 0), aqi_max: 50.4 },
      { ...row("gomel", "2026-10-03", 0), aqi_max: 71 },
      { ...row("mozyr", "2026-10-03", 0), aqi_max: 160 },
    ]
    expect(aqiDayCounts(rows, "gomel", { from: "2026-10-01", to: "2026-10-03" })).toEqual({
      total: 3,
      counts: { good: 2, moderate: 1 },
    })
  })
})

describe("summarizeAll", () => {
  it("summarizes every pollutant against its own norm", () => {
    const rows: DailyRow[] = [
      { ...row("gomel", "2026-10-01", 20), no2_avg: 30 },
      { ...row("gomel", "2026-10-02", 10), no2_avg: 5 },
    ]
    const all = summarizeAll(
      rows,
      [
        { key: "pm2_5", norm: 15 },
        { key: "no2", norm: 25 },
      ],
      { from: "2026-10-01", to: "2026-10-02" },
    ).get("gomel")
    expect(all?.pm2_5?.daysOver).toBe(1)
    expect(all?.no2).toEqual({ daysOver: 1, daysHigh: 0, daysTotal: 2, worst: { day: "2026-10-01", value: 30 } })
    expect(all?.pm10).toBeUndefined()
  })
})

describe("sortTowns", () => {
  const summary = (daysOver: number, worst: number) => ({
    pm2_5: { daysOver, daysHigh: 0, daysTotal: 30, worst: { day: "2026-10-01", value: worst } },
  })
  const towns: TownRow[] = [
    { id: "a", name: "Ветка", aqi: 40, summary: summary(3, 20) },
    { id: "b", name: "Гомель", aqi: null, summary: summary(12, 23) },
    { id: "c", name: "Брагин", aqi: 55, summary: summary(3, 25) },
    { id: "d", name: "Ельск", aqi: 40, summary: summary(0, 9) },
  ]
  const ids = (key: Parameters<typeof sortTowns>[1], dir: Parameters<typeof sortTowns>[2]) =>
    sortTowns(towns, key, dir).map((t) => t.id)

  it("sorts by days above the norm, then by the worst day", () => {
    expect(ids("pm2_5", "desc")).toEqual(["b", "c", "a", "d"])
    expect(ids("pm2_5", "asc")).toEqual(["d", "a", "c", "b"])
  })

  it("keeps towns without a current AQI last and breaks ties by name", () => {
    expect(ids("aqi", "desc")).toEqual(["c", "a", "d", "b"])
    expect(ids("aqi", "asc")).toEqual(["a", "d", "c", "b"])
  })

  it("sorts by name in Russian alphabetical order", () => {
    expect(ids("name", "asc")).toEqual(["c", "a", "b", "d"])
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

describe("pointDays", () => {
  it("returns one value per day for the town, null where the day is missing", () => {
    const rows = [row("a", "2026-10-01", 10), row("b", "2026-10-01", 99), row("a", "2026-10-03", 20)]
    expect(pointDays(rows, "a", "pm2_5", ["2026-10-01", "2026-10-02", "2026-10-03"])).toEqual([
      { day: "2026-10-01", value: 10 },
      { day: "2026-10-02", value: null },
      { day: "2026-10-03", value: 20 },
    ])
  })
})

describe("firstDataDay", () => {
  it("returns the earliest day with data inside the range", () => {
    const rows = [row("a", "2026-07-31", 1), row("b", "2026-08-02", 1), row("a", "2025-12-31", 1)]
    expect(firstDataDay(rows, { from: "2026-01-01", to: "2026-11-13" })).toBe("2026-07-31")
    expect(firstDataDay([], { from: "2026-01-01", to: "2026-11-13" })).toBeNull()
  })
})

describe("buckets", () => {
  it("keeps days as cells up to 92 days (90-day period stays daily)", () => {
    expect(buckets(daysBetween("2026-01-01", "2026-03-31"))).toHaveLength(90)
    const days = daysBetween("2026-11-01", "2026-11-30")
    expect(buckets(days)).toHaveLength(30)
    expect(buckets(days)[0]).toEqual({ from: "2026-11-01", to: "2026-11-01", days: ["2026-11-01"] })
  })

  it("groups long periods into Monday-based weeks", () => {
    // 2026-01-01 — четверг: первая неделя неполная (чт–вс), дальше с понедельника
    const weeks = buckets(daysBetween("2026-01-01", "2026-04-30"))
    expect(weeks[0]).toMatchObject({ from: "2026-01-01", to: "2026-01-04" })
    expect(weeks[1]).toMatchObject({ from: "2026-01-05", to: "2026-01-11" })
    expect(weeks.flatMap((w) => w.days)).toHaveLength(120)
  })
})

describe("todayPoint", () => {
  const readings = [
    { point: "gomel", pm2_5: 6 },
    { point: "gomel", pm2_5: 9 },
    { point: "gomel", pm2_5: 12 },
    { point: "mozyr", pm2_5: 20 },
    { point: "mozyr", pm2_5: 22 },
    { point: "korma", pm2_5: 3 },
  ]

  it("averages the hours that have passed today and counts them, with the spread across towns", () => {
    expect(todayPoint(readings, "pm2_5", "gomel", "2026-11-15")).toEqual({
      day: "2026-11-15",
      value: 9,
      hours: 3,
      band: [3, 21],
      minPoint: "korma",
      maxPoint: "mozyr",
    })
  })

  it("returns null when the town has no hours yet today", () => {
    expect(todayPoint(readings, "pm2_5", "rogachev", "2026-11-15")).toBeNull()
    expect(todayPoint([], "pm2_5", "gomel", "2026-11-15")).toBeNull()
  })
})

describe("aqiRange", () => {
  const row = (point: string, day: string, aqi_max: number) =>
    ({ point, day, aqi_max, pm2_5_avg: 0, pm10_avg: 0, no2_avg: 0, so2_avg: 0 }) as const

  it("gives the calmest and the worst daily worst-hour AQI of the town within the period", () => {
    const rows = [
      row("zh", "2026-10-31", 99),
      row("zh", "2026-11-01", 44),
      row("zh", "2026-11-02", 67),
      row("zh", "2026-11-03", 25),
      row("go", "2026-11-02", 120),
    ]
    expect(aqiRange(rows, "zh", { from: "2026-11-01", to: "2026-11-03" })).toEqual({ min: 25, max: 67, days: 3 })
    expect(aqiRange(rows, "zh", { from: "2026-12-01", to: "2026-12-31" })).toBeNull()
  })
})
