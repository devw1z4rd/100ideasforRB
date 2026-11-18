import { describe, expect, it } from "vitest"
import {
  countReports,
  districtPoints,
  groupByDistrict,
  perDistrict,
  rankDesc,
  readCompareParams,
  type CompareState,
} from "./compare"
import type { PolygonGeometry } from "./geo"

describe("districtPoints", () => {
  it("maps districts to their town and Gomelsky district to Gomel", () => {
    const districts = [
      { id: "moz", name: "Мозырский" },
      { id: "gom-d", name: "Гомельский" },
      { id: "gom", name: "г. Гомель" },
      { id: "x", name: "Без точки" },
    ]
    const points = [
      { id: "p-moz", name: "Мозырь", district: "moz" },
      { id: "p-gom", name: "Гомель", district: "gom" },
    ]
    expect(districtPoints(districts, points)).toEqual(
      new Map([
        ["moz", "p-moz"],
        ["gom-d", "p-gom"],
        ["gom", "p-gom"],
      ]),
    )
  })
})

describe("perDistrict", () => {
  it("looks up each district's point and skips missing values", () => {
    const points = new Map([
      ["a", "p1"],
      ["b", "p2"],
    ])
    expect(perDistrict(new Map([["p1", 5]]), points)).toEqual(new Map([["a", 5]]))
  })
})

describe("rankDesc", () => {
  const names = new Map([
    ["a", "Ельский"],
    ["b", "Брагинский"],
    ["c", "Ветковский"],
    ["d", "Лоевский"],
  ])

  it("sorts by value and shares ranks between ties, alphabetically", () => {
    const ranked = rankDesc(
      new Map([
        ["a", 3],
        ["b", 7],
        ["c", 3],
        ["d", 0],
      ]),
      names,
    )
    expect(ranked.map((r) => [r.id, r.rank])).toEqual([
      ["b", 1],
      ["c", 2],
      ["a", 2],
      ["d", 4],
    ])
  })
})

describe("countReports", () => {
  const range = { from: "2026-10-01", to: "2026-10-29" }

  it("counts public reports in the period by Minsk day", () => {
    const counts = countReports(
      [
        { district: "a", created: "2026-10-05 10:00:00.000Z", status: "accepted" },
        { district: "a", created: "2026-10-06 10:00:00.000Z", status: "forwarded" },
        { district: "a", created: "2026-10-07 10:00:00.000Z", status: "resolved" },
        // 22:30 UTC on Sep 30 is already Oct 1 in Minsk
        { district: "b", created: "2026-09-30 22:30:00.000Z", status: "resolved" },
        { district: "b", created: "2026-09-30 20:00:00.000Z", status: "resolved" },
        { district: "b", created: "2026-10-10 10:00:00.000Z", status: "rejected" },
        { created: "2026-10-10 10:00:00.000Z", status: "accepted" },
      ],
      range,
    )
    expect(counts.get("a")).toEqual({ total: 3, open: 2, resolved: 1 })
    expect(counts.get("b")).toEqual({ total: 1, open: 0, resolved: 1 })
    expect(counts.size).toBe(2)
  })
})

describe("groupByDistrict", () => {
  const square: PolygonGeometry = {
    type: "Polygon",
    coordinates: [
      [
        [30, 52],
        [31, 52],
        [31, 53],
        [30, 53],
        [30, 52],
      ],
    ],
  }

  it("puts items into the district polygon they fall into", () => {
    const items = [
      { name: "in", at: { lat: 52.5, lon: 30.5 } },
      { name: "out", at: { lat: 54, lon: 30.5 } },
    ]
    const grouped = groupByDistrict(items, (i) => i.at, [{ id: "d", geometry: square }])
    expect(grouped.get("d")?.map((i) => i.name)).toEqual(["in"])
    expect(grouped.size).toBe(1)
  })
})

describe("readCompareParams", () => {
  const names = ["г. Гомель", "Мозырский", "Лельчицкий"]
  const defaults: CompareState = { metric: "pm2_5", period: "90d", a: "г. Гомель", b: "Мозырский" }
  const periods = ["30d", "90d", "ytd"] as const
  const read = (query: string) => readCompareParams(new URLSearchParams(query), names, defaults, periods)

  it("falls back to defaults", () => {
    expect(read("")).toEqual(defaults)
    expect(read("m=co&p=7d&a=Нигде")).toEqual(defaults)
  })

  it("reads valid values", () => {
    expect(read("m=reports&p=ytd&a=Лельчицкий&b=г.+Гомель")).toEqual({
      metric: "reports",
      period: "ytd",
      a: "Лельчицкий",
      b: "г. Гомель",
    })
  })

  it("never compares a district with itself", () => {
    expect(read("a=Мозырский")).toMatchObject({ a: "Мозырский", b: "г. Гомель" })
    expect(read("a=Лельчицкий&b=Лельчицкий")).toMatchObject({ a: "Лельчицкий", b: "г. Гомель" })
  })
})
