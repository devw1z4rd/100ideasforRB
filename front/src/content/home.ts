export type SectionId = "map" | "air" | "enterprises" | "water"

export type HomeSection = {
  id: SectionId
  navLabel: string
  eyebrow: string
  title: string
  /** plain — светлая секция в контейнере; card — тёмная панель со скруглением; bleed — тёмная полоса во всю ширину */
  variant: "plain" | "card" | "bleed"
  /** Резерв высоты скелетона, px (на мобиле — половина) */
  minHeight: number
}

// Порядок и тон секций — по макету главной (CLAUDE.md §10.4–10.8)
export const homeSections: readonly HomeSection[] = [
  {
    id: "map",
    navLabel: "Карта",
    eyebrow: "Карта",
    title: "Карта экологической обстановки",
    variant: "card",
    minHeight: 680,
  },
  {
    id: "air",
    navLabel: "Воздух",
    eyebrow: "Воздух",
    title: "Качество атмосферного воздуха",
    variant: "plain",
    minHeight: 520,
  },
  {
    id: "enterprises",
    navLabel: "Предприятия",
    eyebrow: "Предприятия",
    title: "Предприятия и вклад в загрязнение",
    variant: "bleed",
    minHeight: 560,
  },
  {
    id: "water",
    navLabel: "Вода",
    eyebrow: "Вода",
    title: "Состояние поверхностных вод",
    variant: "plain",
    minHeight: 360,
  },
]
