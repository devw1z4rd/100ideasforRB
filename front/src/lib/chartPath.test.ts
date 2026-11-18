import { describe, expect, it } from "vitest"
import { monotonePath, niceTicks } from "./chartPath"

describe("monotonePath", () => {
  it("starts at the first point and ends at the last", () => {
    const d = monotonePath([
      [0, 10],
      [10, 20],
      [20, 15],
    ])
    expect(d.startsWith("M0,10")).toBe(true)
    expect(d.endsWith("20,15")).toBe(true)
    expect(d.match(/C/g)).toHaveLength(2)
  })

  it("keeps control points within the data range at an extremum (no overshoot)", () => {
    const d = monotonePath([
      [0, 0],
      [10, 10],
      [20, 0],
    ])
    const ys = [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => Number(m[2]))
    expect(Math.max(...ys)).toBeLessThanOrEqual(10)
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0)
  })

  it("handles one point and no points", () => {
    expect(monotonePath([[5, 5]])).toBe("M5,5")
    expect(monotonePath([])).toBe("")
  })
})

describe("niceTicks", () => {
  it("uses round steps inside the range", () => {
    expect(niceTicks(33, 78)).toEqual([40, 50, 60, 70])
    expect(niceTicks(-12, 9, 3)).toEqual([-10, -5, 0, 5])
  })

  it("never returns negative zero", () => {
    expect(Object.is(niceTicks(-3, 25)[0], -0)).toBe(false)
  })

  it("returns the single value for an empty range", () => {
    expect(niceTicks(5, 5)).toEqual([5])
  })
})
