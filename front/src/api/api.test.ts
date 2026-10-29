import { describe, expect, it } from "vitest"
import { latestByPoint, type AirReading } from "./air"
import { parsePbDate, pbDay } from "./dates"
import { reportsFilter } from "./reports"

const reading = (point: string, ts: string, us_aqi: number): AirReading => ({
  point,
  ts,
  us_aqi,
  pm2_5: 0,
  pm10: 0,
  no2: 0,
  so2: 0,
  o3: 0,
  co: 0,
})

describe("dates", () => {
  it("parses PocketBase dates with a space separator as UTC", () => {
    expect(parsePbDate("2026-10-29 19:40:11.826Z")?.toISOString()).toBe("2026-10-29T19:40:11.826Z")
  })

  it("returns null for empty and invalid values", () => {
    expect(parsePbDate("")).toBeNull()
    expect(parsePbDate(undefined)).toBeNull()
    expect(parsePbDate("not a date")).toBeNull()
  })

  it("takes the calendar day regardless of the browser time zone", () => {
    expect(pbDay("2026-10-20 00:00:00.000Z")).toBe("2026-10-20")
  })
})

describe("latestByPoint", () => {
  it("keeps the first (newest) reading per point from a list sorted by ts desc", () => {
    const latest = latestByPoint([
      reading("a", "2026-10-29 19:00:00.000Z", 60),
      reading("b", "2026-10-29 19:00:00.000Z", 40),
      reading("a", "2026-10-29 18:00:00.000Z", 55),
    ])
    expect([...latest.keys()]).toEqual(["a", "b"])
    expect(latest.get("a")?.us_aqi).toBe(60)
  })
})

describe("reportsFilter", () => {
  it("is empty without conditions", () => {
    expect(reportsFilter({})).toBe("")
    expect(reportsFilter({ status: [] })).toBe("")
  })

  it("joins statuses with OR and other conditions with AND, quoting values", () => {
    expect(reportsFilter({ status: ["accepted", "resolved"], district: "abc", author: 'u"1' })).toBe(
      `(status = "accepted" || status = "resolved") && district = "abc" && author = "u\\"1"`,
    )
  })
})
