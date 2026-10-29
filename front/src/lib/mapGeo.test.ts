import { describe, expect, it } from "vitest"
import { scaleBar, snapToLines } from "./mapGeo"

describe("snapToLines", () => {
  it("returns the closest vertex across all lines", () => {
    const lines = [
      [
        [30, 52],
        [30.5, 52.2],
      ],
      [[29, 51]],
    ]
    expect(snapToLines(lines, 30.4, 52.3)).toEqual({ lon: 30.5, lat: 52.2 })
    expect(snapToLines([], 30, 52)).toBeNull()
  })
})

describe("scaleBar", () => {
  it("picks the largest round distance that fits and its length in pixels", () => {
    // zoom 7 на широте Гомеля: ~373 м/пикс, в 120 px — ~44,8 км; крупнейший шаг до этого — 25 км = 67 px
    const { km, px } = scaleBar(7, 52.4)
    expect(km).toBe(25)
    expect(px).toBeGreaterThan(60)
    expect(px).toBeLessThanOrEqual(120)
  })

  it("never exceeds the available width", () => {
    for (const zoom of [5, 6.3, 8, 9.7, 11]) expect(scaleBar(zoom, 52).px).toBeLessThanOrEqual(120)
  })
})
