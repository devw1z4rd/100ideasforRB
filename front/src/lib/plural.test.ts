import { describe, expect, it } from "vitest"
import { plural } from "./plural"

describe("plural", () => {
  it("picks the Russian form for the number", () => {
    const forms = ["участок", "участка", "участков"] as const
    expect([1, 2, 5, 11, 21, 22, 25, 0].map((n) => plural(n, ...forms))).toEqual([
      "участок",
      "участка",
      "участков",
      "участков",
      "участок",
      "участка",
      "участков",
      "участков",
    ])
  })
})
