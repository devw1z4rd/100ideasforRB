// Тема сайта (CLAUDE.md §10.1): светлая, тёмная или как в системе; переключатель — в футере.
// Выбор хранится в localStorage (удобство одного браузера, не данные) и применяется классом .dark на <html>.
// До загрузки React то же делает скрипт в index.html — без вспышки светлой страницы в тёмной теме.
import { useEffect, useState } from "react"

export type ThemePref = "system" | "light" | "dark"
export type Theme = "light" | "dark"

const KEY = "theme"
const DARK_QUERY = "(prefers-color-scheme: dark)"
// Цвет панели браузера на телефоне — фон страницы (= --background в tokens.css)
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
  // На кадр без переходов: иначе фон, рамки и текст перекрашиваются вразнобой, каждый со своей скоростью
  root.classList.add("theme-switching")
  root.classList.toggle("dark", theme === "dark")
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme])
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")))
}

/** Выбранная тема и смена; при «как в системе» следит за сменой темы ОС на лету. */
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
    } catch {
      // Приватный режим или запрет хранилища: тема меняется до перезагрузки
    }
  }

  return [pref, choose] as const
}
