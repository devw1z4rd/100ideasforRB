import { useEffect, useState } from "react"

export type ThemePref = "system" | "light" | "dark"
export type Theme = "light" | "dark"

const KEY = "theme"
const DARK_QUERY = "(prefers-color-scheme: dark)"
// Mobile browser bar color = page background (--background in tokens.css).
const THEME_COLOR: Record<Theme, string> = { light: "#ffffff", dark: "#18181b" }

export function readThemePref(): ThemePref {
  try {
    const value = localStorage.getItem(KEY)
    return value === "light" || value === "dark" ? value : "system"
  } catch {
    return "system"
  }
}

export function resolveTheme(pref: ThemePref, systemDark: boolean): Theme {
  return pref === "system" ? (systemDark ? "dark" : "light") : pref
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (root.classList.contains("dark") === (theme === "dark")) return
  // One frame without transitions, otherwise background, borders and text recolor at different speeds.
  root.classList.add("theme-switching")
  root.classList.toggle("dark", theme === "dark")
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme])
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")))
}

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(readThemePref)

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY)
    const update = () => applyTheme(resolveTheme(pref, media.matches))
    update()
    if (pref !== "system") return
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [pref])

  const choose = (next: ThemePref) => {
    setPref(next)
    try {
      if (next === "system") localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, next)
    } catch {}
  }

  return [pref, choose] as const
}
