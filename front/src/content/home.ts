export type SectionId = "map" | "air" | "enterprises" | "water"

export const sectionHeadingId = (id: SectionId) => `${id}-title`

export type HomeSection = {
  id: SectionId
  navLabel: string
  eyebrow: string
  title: string
  titleHidden?: boolean
  variant: "plain" | "card" | "bleed"
  minHeight: number
}

export const homeSections: readonly HomeSection[] = [
  {
    id: "map",
    navLabel: "Карта",
    eyebrow: "",
    title: "Карта экологической обстановки",
    titleHidden: true,
    variant: "card",
    minHeight: 680,
  },
  {
    id: "air",
    navLabel: "Воздух",
    eyebrow: "",
    title: "Качество атмосферного воздуха",
    variant: "plain",
    minHeight: 520,
  },
  {
    id: "water",
    navLabel: "Вода",
    eyebrow: "",
    title: "Состояние поверхностных вод",
    variant: "plain",
    minHeight: 360,
  },
  {
    id: "enterprises",
    navLabel: "Предприятия",
    eyebrow: "",
    title: "Предприятия и вклад в загрязнение",
    variant: "plain",
    minHeight: 1080,
  },
]
