import { describe, expect, it } from "vitest"
import { AQI_SCALE, aqiCategory, type AqiLevel } from "./aqi"

describe("aqiCategory", () => {
  // Границы категорий US EPA включительно
  const cases: ReadonlyArray<[number, AqiLevel]> = [
    [0, "good"],
    [50, "good"],
    [51, "moderate"],
    [100, "moderate"],
    [101, "usg"],
    [150, "usg"],
    [151, "unhealthy"],
    [200, "unhealthy"],
    [201, "very-unhealthy"],
    [300, "very-unhealthy"],
    [301, "hazardous"],
    [500, "hazardous"],
  ]

  it.each(cases)("%d → %s", (value, level) => {
    expect(aqiCategory(value)?.level).toBe(level)
  })

  it("округляет дробные значения до целого индекса", () => {
    expect(aqiCategory(50.4)?.level).toBe("good")
    expect(aqiCategory(50.5)?.level).toBe("moderate")
  })

  it("«опасный» открыт сверху: значения выше 500 тоже в нём", () => {
    expect(aqiCategory(742)?.level).toBe("hazardous")
  })

  it("возвращает null для отсутствующих и некорректных значений", () => {
    for (const value of [null, undefined, Number.NaN, -1, Number.POSITIVE_INFINITY]) {
      expect(aqiCategory(value)).toBeNull()
    }
  })
})

describe("AQI_SCALE", () => {
  it("начинается с 0, идёт без пропусков и пересечений, последняя категория открыта сверху", () => {
    expect(AQI_SCALE[0]?.min).toBe(0)
    expect(AQI_SCALE.at(-1)?.max).toBe(Number.POSITIVE_INFINITY)
    AQI_SCALE.slice(1).forEach((category, i) => {
      expect(category.min).toBe(AQI_SCALE[i]!.max + 1)
    })
  })

  it("у каждой категории есть подпись и цвет из токенов", () => {
    for (const category of AQI_SCALE) {
      expect(category.label).not.toBe("")
      expect(category.color).toBe(`var(--aqi-${category.level})`)
    }
  })
})
