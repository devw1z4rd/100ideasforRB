import { describe, expect, it } from "vitest"
import { hero } from "./hero"

describe("hero content", () => {
  const used = [...hero.lead.matchAll(/\{(\w+)\}/g)].map((m) => m[1])

  it("every {key} in lead has a fact", () => {
    for (const key of used) expect(hero.facts, `fact for {${key}}`).toHaveProperty(key)
  })

  it("every fact is used in lead", () => {
    for (const key of Object.keys(hero.facts)) expect(used, `fact "${key}" unused`).toContain(key)
  })

  it("has non-empty fact sources", () => {
    expect(hero.factsSources.length).toBeGreaterThan(0)
    for (const s of hero.factsSources) {
      expect(s.title.trim()).not.toBe("")
      expect(s.publisher.trim()).not.toBe("")
      expect(() => new URL(s.url)).not.toThrow()
    }
  })
})
