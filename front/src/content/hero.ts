import { t } from "@/lib/locale"
export type HeroFact = { value: number; format: string }
export type MetaRow = { label: string; value?: string; to?: string }
export type FactSource = { label: string; title: string; publisher: string; url: string; year: number }

type Hero = {
  title: string
}

export const hero: Hero = {
  title: t("Экологический профиль Гомельщины", "Экалагічны профіль Гомельшчыны"),
}
