import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe("site language", () => {
  it("defaults to Russian when the HTML shell has no locale", async () => {
    const { intlLocale, t } = await import("./locale")
    expect(intlLocale).toBe("ru-RU")
    expect(t("Вода", "Вада")).toBe("Вода")
  })

  it("uses Belarusian for interface copy, dates and names while retaining data keys", async () => {
    vi.stubGlobal("document", { documentElement: { lang: "be" } })
    const { compare } = await import("@/content/compare")
    const { districtName, townName } = await import("@/content/placeNames")
    const { kb, kbCategoryLabel } = await import("@/content/kb")
    const { formatDate } = await import("./format")

    expect(compare.title).toBe("Параўнанне раёнаў")
    expect(compare.defaults.b).toBe("Мозырский")
    expect(districtName({ name: "Мозырский", name_be: "Мазырскі" })).toBe("Мазырскі")
    expect(districtName({ name: "Мозырский" })).toBe("Мозырский")
    expect(townName("Жлобин")).toBe("Жлобін")
    expect(kb.categories[0]).toBe("Воздух")
    expect(kbCategoryLabel(kb.categories[0])).toBe("Паветра")
    expect(formatDate("2026-01-01")).toContain("студзеня")
  })

  it.each([
    ["ru", "be"],
    ["be", "ru"],
  ])("switches from %s to %s on the current address", async (current, next) => {
    const location = {
      href: "https://eco.example/compare?a=1&b=2#comparison",
      reload: vi.fn(),
      replace: vi.fn(),
    }
    const setItem = vi.fn()
    vi.stubGlobal("document", { documentElement: { lang: current } })
    vi.stubGlobal("window", { location, localStorage: { setItem } })
    const { switchLanguage } = await import("./locale")
    switchLanguage()
    expect(setItem).toHaveBeenCalledWith("eco-locale", next)
    expect(location.reload).toHaveBeenCalledOnce()
    expect(location.replace).not.toHaveBeenCalled()
  })

  it("keeps the route, parameters and anchor when browser storage is blocked", async () => {
    const location = {
      href: "https://eco.example/compare?a=1&b=2#comparison",
      replace: vi.fn(),
    }
    vi.stubGlobal("window", {
      location,
      localStorage: {
        setItem: () => {
          throw new Error("Storage unavailable")
        },
      },
    })
    const { switchLanguage } = await import("./locale")
    switchLanguage()
    expect(location.replace.mock.calls[0][0].href).toBe(
      "https://eco.example/compare?a=1&b=2&lang=be#comparison",
    )
  })
})
