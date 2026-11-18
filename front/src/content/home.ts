export type SectionId = "map" | "air" | "enterprises" | "water"

/** id заголовка секции: на него ссылаются aria-labelledby и фокус после перехода из MobileNav. */
export const sectionHeadingId = (id: SectionId) => `${id}-title`

export type HomeSection = {
  id: SectionId
  navLabel: string
  /** Надпись над заголовком; пустая — без неё */
  eyebrow: string
  title: string
  /** Заголовок только для скринридеров: карта говорит сама за себя, а раздел и так назван в шапке */
  titleHidden?: boolean
  /** plain — светлая секция в контейнере; card — тёмная панель со скруглением почти во всю ширину экрана; bleed — тёмная полоса во всю ширину */
  variant: "plain" | "card" | "bleed"
  /** Резерв высоты скелетона, px (на мобиле — половина) */
  minHeight: number
}

// Надписей над заголовками нет: «Карта» над «Картой экологической обстановки» только повторяла навигацию.
// Тон секций — по макету главной (CLAUDE.md §10.4–10.8); порядок: «Предприятия» перенесены в конец, после «Воды».
// По этому же порядку строятся пункты навигации в шапке (content/nav.ts)
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
    // Без надписи: год и так виден на таймлайне и в карточках, а блок должен помещаться в экран
    eyebrow: "",
    title: "Предприятия и вклад в загрязнение",
    // Фон — по теме сайта (раньше был всегда чёрным: в светлой теме выпадал, в тёмной — «чёрная дыра»)
    variant: "plain",
    minHeight: 1080,
  },
]
