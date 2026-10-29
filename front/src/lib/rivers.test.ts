import { describe, expect, it } from "vitest"
import {
  chartThresholds,
  latestDay,
  riverStatus,
  summarizePosts,
  trendOf,
  type RiverLevel,
  type RiverPost,
} from "./rivers"

const post = (id: string, river: string, name: string, low = 0, flood = 0, danger = 0): RiverPost => ({
  id,
  code: 1,
  name,
  river,
  district: "",
  lat: 52,
  lon: 30,
  low_level: low,
  flood_level: flood,
  danger_level: danger,
})
const level = (p: string, day: string, value: number, change = 0): RiverLevel => ({
  post: p,
  day,
  level: value,
  change,
  ice: "",
})

describe("riverStatus", () => {
  const gomel = post("g", "Сож", "Гомель", 70, 330, 500)

  it("как у Белгидромета: ниже судоходного — маловодье, выше поймы — пойма, выше опасного — опасно", () => {
    expect(riverStatus(15, gomel)).toBe("low")
    expect(riverStatus(70, gomel)).toBe("normal")
    expect(riverStatus(331, gomel)).toBe("flood")
    expect(riverStatus(501, gomel)).toBe("danger")
  })

  it("порог 0 — порога нет", () => {
    const small = post("b", "Брагинка", "Рудня Журавлёва")
    expect(riverStatus(-20, small)).toBe("normal")
    expect(riverStatus(900, small)).toBe("normal")
    // Есть только пойма
    expect(riverStatus(250, post("u", "Ивня-Бонда", "Будка", 0, 241))).toBe("flood")
  })
})

describe("trendOf", () => {
  it("знак изменения за сутки", () => {
    expect(trendOf(2)).toBe("up")
    expect(trendOf(0)).toBe("flat")
    expect(trendOf(-1)).toBe("down")
  })
})

describe("summarizePosts", () => {
  const posts = [
    post("small", "Брагинка", "Рудня Журавлёва"),
    post("zhl", "Днепр", "Жлобин", 94, 270, 400),
    post("gom", "Сож", "Гомель", 70, 330, 500),
    post("svt", "Березина", "Светлогорск", 400, 550, 690),
    post("empty", "Уза", "Прибор"),
  ]
  const levels = [
    level("gom", "2026-10-29", 15, 1),
    level("gom", "2026-10-28", 14, 1),
    level("gom", "2026-10-27", 80, -2),
    level("zhl", "2026-10-29", 49, -1),
    level("svt", "2026-10-29", 410),
    level("small", "2026-10-29", 84),
  ]
  const result = summarizePosts(posts, levels)

  it("последний уровень, тренд и ряд по возрастанию дат", () => {
    const gomel = result.find((s) => s.post.id === "gom")!
    expect(gomel.latest.level).toBe(15)
    expect(gomel.trend).toBe("up")
    expect(gomel.series.map((l) => l.day)).toEqual(["2026-10-27", "2026-10-28", "2026-10-29"])
    expect(gomel.daysLow).toBe(2)
  })

  it("посты без наблюдений пропускает, у несудоходных daysLow = null", () => {
    expect(result.some((s) => s.post.id === "empty")).toBe(false)
    expect(result.find((s) => s.post.id === "small")!.daysLow).toBeNull()
  })

  it("сначала судоходные: маловодье по доле от порога, потом норма; несудоходные в конце", () => {
    // Гомель 15/70 ≈ 0,21 хуже Жлобина 49/94 ≈ 0,52
    expect(result.map((s) => s.post.id)).toEqual(["gom", "zhl", "svt", "small"])
  })

  it("latestDay — самый свежий день", () => {
    expect(latestDay(result)).toBe("2026-10-29")
    expect(latestDay([])).toBeNull()
  })
})

describe("chartThresholds", () => {
  it("судоходный всегда, пойма — только когда уровень к ней близок", () => {
    const p = post("g", "Сож", "Гомель", 70, 330, 500)
    const low = summarizePosts([p], [level("g", "2026-10-29", 15)])[0]
    expect(chartThresholds(low).map((t) => t.kind)).toEqual(["low"])
    const high = summarizePosts([p], [level("g", "2026-04-10", 300)])[0]
    expect(chartThresholds(high).map((t) => t.kind)).toEqual(["low", "flood"])
  })
})
