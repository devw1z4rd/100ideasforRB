import { describe, expect, it } from "vitest"
import { formatNumber, formatRelativeTime } from "./format"

describe("formatNumber", () => {
  it("разделяет разряды неразрывным пробелом и ставит запятую в дробной части", () => {
    const result = formatNumber(1316666)
    expect(result).toMatch(/^1\s316\s666$/)
    expect(result).not.toContain(" ") // обычный пробел разорвал бы число при переносе строки
    expect(formatNumber(40.4)).toBe("40,4")
  })

  it("фиксирует число знаков после запятой, если оно задано", () => {
    expect(formatNumber(40381.8 / 1000, 1)).toBe("40,4")
    expect(formatNumber(21, 1)).toBe("21,0")
  })
})

describe("formatRelativeTime", () => {
  const now = new Date("2026-10-29T12:00:00Z")
  const ago = (ms: number) => new Date(now.getTime() - ms)
  const MIN = 60_000
  const HOUR = 60 * MIN
  const DAY = 24 * HOUR

  it("меньше минуты и время из будущего (рассинхрон часов) — «только что»", () => {
    expect(formatRelativeTime(ago(30_000), now)).toBe("только что")
    expect(formatRelativeTime(new Date(now.getTime() + 5 * MIN), now)).toBe("только что")
  })

  it("минуты, часы и дни — с русскими падежами", () => {
    expect(formatRelativeTime(ago(MIN), now)).toBe("1 минуту назад")
    expect(formatRelativeTime(ago(14 * MIN), now)).toBe("14 минут назад")
    expect(formatRelativeTime(ago(3 * HOUR), now)).toBe("3 часа назад")
    expect(formatRelativeTime(ago(DAY), now)).toBe("вчера")
    expect(formatRelativeTime(ago(5 * DAY), now)).toBe("5 дней назад")
  })
})
