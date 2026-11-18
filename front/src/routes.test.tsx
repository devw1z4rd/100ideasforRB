import { matchRoutes } from "react-router"
import { describe, expect, it } from "vitest"
import { footer, cta, login, pages } from "@/content/nav"
import { routes } from "./routes"

const claudeMdPaths = [
  "/reports",
  "/reports/new",
  "/reports/123",
  "/compare",
  "/news",
  "/news/x",
  "/kb",
  "/kb/x",
  "/data",
  "/login",
  "/me",
  "/moderation",
]

const navTargets = [...pages.map((p) => p.to), cta.to, login.to, footer.data.to]

describe("routes", () => {
  it.each([...new Set([...claudeMdPaths, ...navTargets])])("%s resolves to a real route", (path) => {
    const matches = matchRoutes(routes, path)
    expect(matches, path).not.toBeNull()
    expect(matches?.at(-1)?.route.path).not.toBe("*")
  })
})
