import { describe, expect, it } from "vitest"
import { pickActiveSection } from "./activeSection"

const HEADER = 56
const layout = (...tops: number[]) =>
  ["map", "air", "enterprises", "water"].map((id, i) => ({ id, top: tops[i] ?? 9999 }))

describe("pickActiveSection", () => {
  it("возвращает null, пока все секции ниже шапки (виден hero)", () => {
    expect(pickActiveSection(layout(300, 1100, 1800, 2500), HEADER)).toBeNull()
  })

  it("активирует первую секцию, когда её верх дошёл до шапки", () => {
    expect(pickActiveSection(layout(56, 800, 1500, 2200), HEADER)).toBe("map")
  })

  it("выбирает последнюю ушедшую под шапку секцию", () => {
    expect(pickActiveSection(layout(-900, -100, 600, 1300), HEADER)).toBe("air")
  })

  it("внизу страницы активна последняя секция, даже если её верх ниже шапки", () => {
    expect(pickActiveSection(layout(-2000, -1200, -400, 300), HEADER, true)).toBe("water")
  })

  it("возвращает null для пустого списка", () => {
    expect(pickActiveSection([], HEADER)).toBeNull()
    expect(pickActiveSection([], HEADER, true)).toBeNull()
  })
})
