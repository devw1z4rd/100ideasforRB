export type HeroFact = { value: number; format: string }
export type MetaRow = { label: string; value?: string; to?: string }
export type FactSource = { label: string; title: string; publisher: string; url: string; year: number }

type Hero = {
  eyebrow: string
  title: string
  /** {key} заменяется выделенным facts[key].format */
  lead: string
  facts: Record<string, HeroFact>
  /** Источники утверждений lead — подписью под абзацем (CLAUDE.md §3) */
  factsSources: readonly FactSource[]
  /** Мета-блок справа; строки без value не выводятся */
  meta: readonly MetaRow[]
}

export const hero: Hero = {
  eyebrow: "Гомельская область · Беларусь",
  title: "Экологический профиль Гомельщины",
  lead: "Крупнейшая область страны, {area}: Белорусское Полесье, бассейны Сожа, Припяти и Днепра, {districts}. Леса и болота, промышленность Жлобина, Мозыря и Светлогорска и наследие чернобыльской аварии на юге.",
  facts: {
    area: { value: 40.4, format: "40,4 тыс. км²" },
    districts: { value: 21, format: "21 район" },
  },
  factsSources: [
    {
      label: "Площадь и число районов",
      title: "Статистический ежегодник Гомельской области, 2026",
      publisher: "Главное статистическое управление Гомельской области",
      url: "https://gomel.belstat.gov.by/ofitsialnaya-statistika/publications/izdaniya/public_compilation/index_166762/",
      year: 2026,
    },
    {
      label: "сравнение площади областей",
      title: "Регионы Республики Беларусь, 2026 (том 1)",
      publisher: "Белстат",
      url: "https://www.belstat.gov.by/ofitsialnaya-statistika/publications/izdania/public_compilation/index_166773/",
      year: 2026,
    },
  ],
  meta: [{ label: "Источники", value: "Данные и методика", to: "/data" }],
}
