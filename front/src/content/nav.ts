import { homeSections, type SectionId } from "./home"

export type AnchorItem = { id: SectionId; label: string }
export type PageItem = { to: string; label: string }

export const site = {
  name: "Экология Гомельской области",
  title: "Экологический профиль Гомельщины",
} as const

export const anchors: readonly AnchorItem[] = homeSections.map(({ id, navLabel }) => ({
  id,
  label: navLabel,
}))
export const anchorIds: readonly SectionId[] = anchors.map((a) => a.id)

export const pages: readonly PageItem[] = [
  { to: "/compare", label: "Сравнение" },
  { to: "/calculator", label: "Калькулятор" },
  { to: "/news", label: "Новости" },
  { to: "/kb", label: "База знаний" },
]

export const cta = { to: "/reports/new", label: "Сообщить о проблеме", shortLabel: "Сообщить" } as const
export const login = { to: "/login", label: "Войти" } as const

export const footer = {
  data: { to: "/data", label: "Данные и методика" },
  // Админка PocketBase — вне SPA, обычная ссылка (в dev идёт через прокси Vite)
  admin: { href: "/_/", label: "Вход для администратора" },
  toTop: { label: "Наверх" },
} as const
