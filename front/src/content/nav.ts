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
  { to: "/results", label: "Результаты" },
  { to: "/compare", label: "Сравнение" },
  { to: "/news", label: "Новости" },
  { to: "/kb", label: "База знаний" },
]

/** Выпадающий пункт шапки со страницами `pages` */
export const more = { label: "Ещё" } as const

export const cta = { to: "/reports/new", label: "Сообщить о проблеме", shortLabel: "Сообщить" } as const
export const login = { to: "/login", label: "Войти" } as const
/** Вошедший пользователь: вместо «Войти» — профиль */
export const account = (name: string | undefined) => ({ to: "/me", label: name?.trim() || "Профиль" })

export const footer = {
  data: { to: "/data", label: "Данные и методика" },
  // Свежесть автосбора воздуха (CLAUDE.md §4 M2): тихая строка в футере, не в шапке
  airUpdated: { to: "/data", label: "Воздух: обновлено" },
  toTop: { label: "Наверх" },
  // Последний экран страницы: зацепить — сообщить о проблеме или пойти смотреть свой город
  hook: "Заметили свалку, дым или сброс в реку?",
  hookLead:
    "Отметьте место на карте и приложите фото. Модератор проверит обращение, а его путь — от «принято» до «устранено» — увидят все.",
  airLink: { hash: "air", label: "Чем дышит мой город" },
  columns: { home: "На главной", pages: "Разделы" },
  /** Живые цифры над подписью: блок окрашен по худшему AQI в области прямо сейчас */
  pulse: {
    label: "Пульс области",
    good: (n: number, total: number) => `${n} из ${total}`,
    goodCaption: "городов с хорошим воздухом сейчас",
    worstCaption: (label: string) => `худший AQI в области сейчас — «${label}». Этим цветом и окрашен блок`,
    updatedCaption: "обновились данные о воздухе",
  },
  wordmark: "Гомельщина",
  theme: {
    label: "Тема",
    options: { light: "Светлая", dark: "Тёмная", system: "Как в системе" },
  },
} as const
