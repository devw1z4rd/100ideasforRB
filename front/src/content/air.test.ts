import { describe, expect, it } from "vitest"
import { air } from "./air"

describe("air.aboveNorm", () => {
  it("speaks in percent below twice the norm and in times above it", () => {
    expect(air.aboveNorm(25.3, 25)).toBe("на 1% выше нормы")
    expect(air.aboveNorm(22.3, 15)).toBe("на 49% выше нормы")
    expect(air.aboveNorm(31.5, 15)).toBe("в 2,1 раза выше нормы")
  })
})
