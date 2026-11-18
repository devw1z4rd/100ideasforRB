import { describe, expect, it } from "vitest"
import {
  bestWindow,
  forecastDays,
  hourProfile,
  hourRange,
  minskDayStart,
  minskHour,
  profileExtremes,
  type HourlyRow,
} from "./airHourly"

const row = (ts: string, us_aqi: number, pm2_5 = 0): HourlyRow => ({
  ts,
  us_aqi,
  pm2_5,
  pm10: 0,
  no2: 0,
  so2: 0,
})

describe("minskHour", () => {
  it("shifts UTC by three hours, crossing midnight", () => {
    expect(minskHour("2026-11-14 20:00:00.000Z")).toEqual({ day: "2026-11-14", hour: 23 })
    expect(minskHour("2026-11-14 21:00:00.000Z")).toEqual({ day: "2026-11-15", hour: 0 })
  })

  it("gives the UTC start of a Minsk day", () => {
    expect(minskDayStart("2026-11-15").toISOString()).toBe("2026-11-14T21:00:00.000Z")
  })
})

describe("forecastDays", () => {
  it("groups by Minsk day into 24 slots and marks past hours", () => {
    const days = forecastDays(
      [
        row("2026-11-14 09:00:00.000Z", 30),
        row("2026-11-14 12:00:00.000Z", 40),
        row("2026-11-14 21:00:00.000Z", 50),
      ],
      new Date("2026-11-14T10:00:00Z"),
    )
    expect(days.map((d) => d.day)).toEqual(["2026-11-14", "2026-11-15"])
    expect(days[0].hours[12]).toMatchObject({ us_aqi: 30, past: true })
    expect(days[0].hours[15]).toMatchObject({ us_aqi: 40, past: false })
    expect(days[1].hours[0]).toMatchObject({ us_aqi: 50 })
    expect(days[0].hours.filter(Boolean)).toHaveLength(2)
  })
})

describe("bestWindow", () => {
  const hours = Array.from({ length: 24 }, (_, h) => ({ us_aqi: h >= 11 && h < 14 ? 20 : 60 }))

  it("finds the window with the lowest worst hour", () => {
    expect(bestWindow(hours)).toEqual({ start: 11, end: 14, aqi: 20 })
  })

  it("skips hours that already passed and gaps", () => {
    expect(bestWindow(hours, { minHour: 12 })).toEqual({ start: 12, end: 15, aqi: 60 })
    const gappy = hours.map((h, i) => (i === 12 ? null : h))
    expect(bestWindow(gappy)?.start).not.toBe(11)
    expect(bestWindow(hours, { minHour: 21 })).toBeNull()
  })
})

describe("hourProfile and extremes", () => {
  // 15 ноября 2026 — воскресенье, 16 — понедельник
  const rows = [
    row("2026-11-15 16:00:00.000Z", 0, 30), // вс 19:00
    row("2026-11-16 16:00:00.000Z", 0, 10), // пн 19:00
    row("2026-11-16 10:00:00.000Z", 0, 4), // пн 13:00
  ]

  it("averages by Minsk hour and counts days above the norm", () => {
    const p = hourProfile(rows, "pm2_5", 15)
    expect(p[19]).toEqual({ hour: 19, mean: 20, over: 1, total: 2 })
    expect(p[13]).toMatchObject({ mean: 4, over: 0, total: 1 })
    expect(p[0].mean).toBeNull()
  })

  it("filters weekdays and weekends", () => {
    expect(hourProfile(rows, "pm2_5", 15, "weekends")[19].mean).toBe(30)
    expect(hourProfile(rows, "pm2_5", 15, "weekdays")[19].mean).toBe(10)
  })

  it("finds worst and best windows, wrapping midnight", () => {
    const full = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      mean: hour >= 22 || hour < 1 ? 30 : hour >= 13 && hour < 16 ? 2 : 10,
      over: 0,
      total: 1,
    }))
    expect(profileExtremes(full)).toEqual({ worst: { start: 22, mean: 30 }, best: { start: 13, mean: 2 } })
    expect(profileExtremes(hourProfile(rows, "pm2_5", 15))).toBeNull()
  })

  it("formats hour ranges", () => {
    expect(hourRange(22, 25)).toBe("22:00–01:00")
    expect(hourRange(9, 12)).toBe("09:00–12:00")
  })
})
