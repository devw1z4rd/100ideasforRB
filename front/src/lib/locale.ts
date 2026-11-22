export type Locale = "ru" | "be"

// The HTML shell applies the preference before imports initialize their text and formatters.
export const locale: Locale =
  typeof document !== "undefined" && document.documentElement.lang === "be" ? "be" : "ru"
export const isBelarusian = locale === "be"
export const intlLocale = isBelarusian ? "be-BY" : "ru-RU"
export const alternateLocale: Locale = isBelarusian ? "ru" : "be"

export function t(russian: string, belarusian: string): string {
  return isBelarusian ? belarusian : russian
}

export function switchLanguage() {
  const url = new URL(window.location.href)
  try {
    window.localStorage.setItem("eco-locale", alternateLocale)
    url.searchParams.delete("lang")
  } catch {
    url.searchParams.set("lang", alternateLocale)
  }
  if (url.href === window.location.href) window.location.reload()
  else window.location.replace(url)
}
