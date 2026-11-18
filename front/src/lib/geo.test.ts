import { describe, expect, it } from "vitest"
import {
  districtAt,
  fitProjection,
  geometryPath,
  inGeometry,
  mergeEnclaves,
  type PolygonGeometry,
} from "./geo"

// Квадрат 30–31° в. д. × 52–53° с. ш. с «дыркой» в середине — как Гомельский район вокруг г. Гомеля
const district: PolygonGeometry = {
  type: "Polygon",
  coordinates: [
    [
      [30, 52],
      [31, 52],
      [31, 53],
      [30, 53],
      [30, 52],
    ],
    [
      [30.4, 52.4],
      [30.6, 52.4],
      [30.6, 52.6],
      [30.4, 52.6],
      [30.4, 52.4],
    ],
  ],
}
const city: PolygonGeometry = { type: "MultiPolygon", coordinates: [[district.coordinates[1]]] }

describe("inGeometry", () => {
  it("finds a point inside the outer ring but not in a hole", () => {
    expect(inGeometry(30.2, 52.2, district)).toBe(true)
    expect(inGeometry(30.5, 52.5, district)).toBe(false)
    expect(inGeometry(31.5, 52.5, district)).toBe(false)
  })

  it("handles multipolygons and missing geometry", () => {
    expect(inGeometry(30.5, 52.5, city)).toBe(true)
    expect(inGeometry(30.5, 52.5, null)).toBe(false)
  })
})

describe("districtAt", () => {
  const districts = [
    { id: "d", geometry: district },
    { id: "c", geometry: city },
  ]

  it("assigns the hole to the city and the rest to the district", () => {
    expect(districtAt(districts, 30.5, 52.5)).toBe("c")
    expect(districtAt(districts, 30.1, 52.9)).toBe("d")
    expect(districtAt(districts, 29, 52)).toBeNull()
  })
})

describe("fitProjection", () => {
  it("fits the bounding box into the width and keeps north up", () => {
    const p = fitProjection([district], 100)
    expect(p.project(30, 53)).toEqual([0, 0])
    const [x, y] = p.project(31, 52)
    expect(x).toBeCloseTo(100)
    expect(y).toBeCloseTo(p.height, 0)
    // Градус долготы на широте 52,5° короче градуса широты: высота больше ширины
    expect(p.height).toBeGreaterThan(100)
  })
})

describe("geometryPath", () => {
  it("draws every ring as a closed subpath", () => {
    const d = geometryPath(district, fitProjection([district], 100))
    expect(d.match(/M/g)).toHaveLength(2)
    expect(d.match(/Z/g)).toHaveLength(2)
    expect(d.startsWith("M0 ")).toBe(true)
  })

  it("drops vertices closer than the step but keeps the ring closed", () => {
    const dense: PolygonGeometry = {
      type: "Polygon",
      coordinates: [
        [
          [30, 52],
          [30.0001, 52],
          [31, 52],
          [31, 53],
          [30, 52],
        ],
      ],
    }
    const d = geometryPath(dense, fitProjection([dense], 100), 1)
    expect(d.match(/L/g)).toHaveLength(3)
  })
})

describe("mergeEnclaves", () => {
  const square = (x0: number, y0: number, size: number) => [
    [x0, y0],
    [x0 + size, y0],
    [x0 + size, y0 + size],
    [x0, y0 + size],
    [x0, y0],
  ]

  it("fills the hole taken by the enclave and drops the enclave itself", () => {
    const district: PolygonGeometry = { type: "Polygon", coordinates: [square(0, 0, 10), square(4, 4, 2)] }
    const city: PolygonGeometry = { type: "Polygon", coordinates: [square(4, 4, 2)] }
    expect(mergeEnclaves([district, city])).toEqual({ type: "MultiPolygon", coordinates: [[square(0, 0, 10)]] })
  })

  it("keeps holes nobody fills and unrelated polygons", () => {
    const district: PolygonGeometry = { type: "Polygon", coordinates: [square(0, 0, 10), square(1, 1, 2)] }
    const island: PolygonGeometry = { type: "Polygon", coordinates: [square(20, 20, 2)] }
    expect(mergeEnclaves([district, island]).coordinates).toEqual([
      [square(0, 0, 10), square(1, 1, 2)],
      [square(20, 20, 2)],
    ])
  })
})
