import { describe, expect, it } from "vitest"
import { hero } from "./hero"

describe("hero content", () => {
  it("has a title", () => {
    expect(hero.title.trim()).not.toBe("")
  })
})
