import { describe, expect, it } from "vitest"
import { groupByCategory } from "./kb"

const a = (title: string, category?: string, order?: number) => ({ title, category, order })

describe("groupByCategory", () => {
  const groups = groupByCategory(
    [
      a("Уровень воды", "Вода", 1),
      a("Без рубрики"),
      a("PM2.5", "Воздух", 2),
      a("AQI", "Воздух", 1),
      a("Шум", "Акустика"),
      a("Качество воды", "Вода", 2),
    ],
    ["Воздух", "Вода"],
    "Разное",
  )

  it("рубрики: заданный порядок, затем остальные по алфавиту, «Разное» в конце", () => {
    expect(groups.map((g) => g.category)).toEqual(["Воздух", "Вода", "Акустика", "Разное"])
  })

  it("внутри рубрики — по order", () => {
    expect(groups[0].articles.map((x) => x.title)).toEqual(["AQI", "PM2.5"])
    expect(groups[1].articles.map((x) => x.title)).toEqual(["Уровень воды", "Качество воды"])
  })
})
