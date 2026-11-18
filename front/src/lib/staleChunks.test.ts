import { describe, expect, it } from "vitest"
import { shouldReload } from "./staleChunks"

const NOW = Date.parse("2026-11-19T12:00:00Z")

describe("shouldReload", () => {
  it("первая ошибка загрузки чанка — перезагрузить", () => {
    expect(shouldReload(NaN, NOW)).toBe(true)
  })

  it("повторная ошибка в течение минуты — не перезагружать, иначе цикл", () => {
    expect(shouldReload(NOW - 5_000, NOW)).toBe(false)
    expect(shouldReload(NOW - 59_999, NOW)).toBe(false)
  })

  it("через минуту — снова можно", () => {
    expect(shouldReload(NOW - 60_000, NOW)).toBe(true)
  })

  it("метка из будущего (перевели часы) — не перезагружать", () => {
    expect(shouldReload(NOW + 10_000, NOW)).toBe(false)
  })
})
