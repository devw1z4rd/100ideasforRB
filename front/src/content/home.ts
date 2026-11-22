import { t } from "@/lib/locale"
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
    title: t("Карта экологической обстановки", "Карта экалагічнай абстаноўкі"),
    titleHidden: true,
    variant: "card",
    minHeight: 680,
  },
  {
    id: "air",
    navLabel: t("Воздух", "Паветра"),
    eyebrow: "",
    title: t("Качество атмосферного воздуха", "Якасць атмасфернага паветра"),
    variant: "plain",
    minHeight: 520,
  },
  {
    id: "water",
    navLabel: t("Вода", "Вада"),
    eyebrow: "",
    title: t("Состояние поверхностных вод", "Стан паверхневых вод"),
    variant: "plain",
    minHeight: 360,
  },
  {
    id: "enterprises",
    navLabel: t("Предприятия", "Прадпрыемствы"),
    eyebrow: "",
    title: t("Предприятия и вклад в загрязнение", "Прадпрыемствы і іх уклад у забруджванне"),
    variant: "plain",
    minHeight: 1080,
  },
]
