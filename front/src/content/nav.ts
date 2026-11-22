import { isBelarusian, t } from "@/lib/locale"
import { homeSections, type SectionId } from "./home"

export type AnchorItem = { id: SectionId; label: string }
export type PageItem = { to: string; label: string }

const brand = t("Экология", "Экалогія")
const region = t("Гомельской области", "Гомельскай вобласці")

export const site = {
  brand,
  region,
  name: `${brand} ${region}`,
  title: t("Экологический профиль Гомельщины", "Экалагічны профіль Гомельшчыны"),
} as const

export const anchors: readonly AnchorItem[] = homeSections.map(({ id, navLabel }) => ({
  id,
  label: navLabel,
}))

export const anchorIds: readonly SectionId[] = anchors.map((a) => a.id)

export const pages: readonly PageItem[] = [
  { to: "/results", label: t("Результаты", "Вынікі") },
  { to: "/compare", label: t("Сравнение", "Параўнанне") },
  { to: "/news", label: t("Новости", "Навіны") },
  { to: "/kb", label: t("База знаний", "База ведаў") },
]

export const more = { label: t("Ещё", "Яшчэ") } as const

export const cta = {
  to: "/reports/new",
  label: t("Сообщить о проблеме", "Паведаміць пра праблему"),
  shortLabel: t("Сообщить", "Паведаміць"),
} as const
export const login = { to: "/login", label: t("Войти", "Увайсці") } as const
export const account = (name: string | undefined) => ({
  to: "/me",
  label: name?.trim() || t("Профиль", "Профіль"),
})

export const footer = {
  data: { to: "/data", label: t("Данные и методика", "Даныя і методыка") },
  airUpdated: { to: "/data", label: t("Воздух: обновлено", "Паветра: абноўлена") },
  toTop: { label: t("Наверх", "Уверх") },
  hook: t("Заметили свалку, дым или сброс в реку?", "Заўважылі звалку, дым або скід у раку?"),
  hookLead: t(
    "Отметьте место на карте и приложите фото. Модератор проверит обращение, а его путь — от «принято» до «устранено» — увидят все.",
    "Пазначце месца на карце і далучыце фота. Мадэратар праверыць зварот, і ўсе змогуць сачыць за ім ад прыняцця да вырашэння.",
  ),
  airLink: { hash: "air", label: t("Чем дышит мой город", "Чым дыхае мой горад") },
  columns: { home: t("На главной", "На галоўнай"), pages: t("Разделы", "Раздзелы") },
  pulse: {
    label: t("Пульс области", "Пульс вобласці"),
    good: (n: number, total: number) => (isBelarusian ? `${n} з ${total}` : `${n} из ${total}`),
    goodCaption: t("городов с хорошим воздухом сейчас", "гарадоў з добрым паветрам цяпер"),
    worstCaption: (label: string) =>
      isBelarusian
        ? `найгоршы AQI ў вобласці цяпер — «${label}». Колер блока адпавядае гэтай катэгорыі`
        : `худший AQI в области сейчас — «${label}». Этим цветом и окрашен блок`,
    updatedCaption: t("обновились данные о воздухе", "абнавіліся даныя пра паветра"),
  },
  wordmark: t("Гомельщина", "Гомельшчына"),
  theme: {
    label: t("Тема", "Тэма"),
    options: { light: "Светлая", dark: t("Тёмная", "Цёмная"), system: t("Как в системе", "Як у сістэме") },
  },
} as const
