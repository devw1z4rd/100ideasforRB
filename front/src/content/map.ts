import type { FactSource } from "./hero"

export type LngLat = { lon: number; lat: number }

const mapSources: readonly FactSource[] = [
  {
    label: "Граница области, районы",
    title: "OpenStreetMap: граница Гомельской области, районы и г. Гомель",
    publisher: "OpenStreetMap contributors, лицензия ODbL",
    url: "https://www.openstreetmap.org/copyright",
    year: 2026,
  },
  {
    label: "Детали при приближении",
    title: "OpenFreeMap: векторные тайлы OpenMapTiles — лес, вода, дороги, деревни",
    publisher: "OpenFreeMap, OpenMapTiles; данные © OpenStreetMap contributors",
    url: "https://openfreemap.org/",
    year: 2026,
  },
  {
    label: "Реки, границы стран и областей",
    title: "Natural Earth 1:10m: реки, границы государств и областей",
    publisher: "Natural Earth, общественное достояние",
    url: "https://www.naturalearthdata.com/",
    year: 2026,
  },
  {
    label: "Координаты городов",
    title: "GeoNames: райцентры области и города соседей",
    publisher: "GeoNames, лицензия CC BY 4.0",
    url: "https://www.geonames.org/",
    year: 2026,
  },
]

export const map = {
  ariaLabel: "Карта Гомельской области",
  sources: mapSources,
  overview: {
    title: "Воздух сейчас",
    good: (n: number, total: number) => `${n} из ${total}`,
    of: (total: number) => `из ${total}`,
    goodCaption: "городов с хорошим воздухом",
    scaleCaption: "каждая отметка — город, шкала AQI",
    worst: "Хуже всего",
    best: "Лучше всего",
    reports: "Обращения жителей",
    reportsOpen: "в работе",
    reportsResolved: "устранено",
  },
  card: {
    district: (name: string) => `${name} район`,
    now: "Сейчас, мкг/м³",
    normMark: "суточная норма ВОЗ",
    nowVsNorm: (value: string, norm: number) => `сейчас ${value} · норма ВОЗ ${norm} мкг/м³`,
    daysTitle: "Дни с PM2.5 выше суточной нормы ВОЗ",
    daysOf: (total: number) => `из ${total}`,
    worstDay: "Худший день",
    noDayData: "нет данных",
    stripLabel: "PM2.5 по дням за 30 суток",
    withinNorm: "в пределах нормы",
    more: "Подробнее о воздухе",
    noData: "Нет свежих данных",
  },
  legend: {
    town: "Город, цвет — AQI сейчас",
    report: "Обращение жителя",
    level: "Пост на реке: уровень растёт / падает, цвет — к порогам поста",
    water: "Участок реки, цвет — худший показатель качества",
  },
  riverDialog: {
    eyebrow: (date: string) => `Уровень воды · Белгидромет, на 8:00 ${date}`,
    description: (river: string, post: string) =>
      `Уровень воды на посту ${post} (${river}) за 30 дней, пороги поста, другие посты на реке и качество воды`,
    expand: "Развернуть: подробно о посте и реке",
    close: "Закрыть",
    now: "Уровень на 8:00",
    day: "За сутки",
    month: (days: number) => `За ${days} дн.`,
    thresholds: "Пороги поста",
    threshold: { low: "Судоходный уровень", flood: "Выход на пойму", danger: "Опасный уровень" },
    noThreshold: "нет",
    noThresholds:
      "У поста нет порогов судоходства, поймы и опасного уровня — уровень можно сравнивать только с его же прошлыми значениями.",
    relation: (kind: "low" | "flood" | "danger", diff: number) => {
      if (diff === 0) return "ровно на пороге"
      if (kind === "low") return diff < 0 ? `на ${-diff} см ниже` : `на ${diff} см выше`
      return diff > 0 ? `выше на ${diff} см` : `до него ${-diff} см`
    },
    others: (river: string) => `Другие посты на реке ${river}`,
    quality: (river: string, quarter: string) => `Качество воды: ${river} · ${quarter}`,
    source: "Белгидромет, pogoda.by",
    toSection: "Раздел «Вода»",
    chart: { max: "макс.", min: "мин.", changeCaption: "столбики — изменение за сутки" },
  },
  tip: {
    level: "Уровень воды",
    water: "Качество воды",
    report: "Обращение жителя",
    place: { problem: "Проблемная территория", clean: "Чистая локация", oopt: "Особо охраняемая территория" },
    levelSource: (date: string) => `Белгидромет · ${date}, 8:00`,
    waterSource: (quarter: string) => `Белгидромет · ${quarter}`,
    deviations: (n: number) => {
      const last = n % 10
      const word =
        n % 100 >= 11 && n % 100 <= 14
          ? "отклонений"
          : last === 1
            ? "отклонение"
            : last >= 2 && last <= 4
              ? "отклонения"
              : "отклонений"
      return `${n} ${word}`
    },
    clean: "в норме",
    ratioHint: (ratio: string) => `×${ratio} — в ${ratio} раза хуже норматива`,
    more: "Подробнее",
  },
  levels: {
    asOf: (date: string) => `Белгидромет, ${date}, 8:00`,
  },
  water: {
    quarter: (q: string) => `Белгидромет, ${q}`,
    clean: "Отклонений от нормативов качества в обзоре нет",
    more: "Подробнее в разделе «Вода»",
  },
  controls: {
    oblast: "Вся область",
    zoomIn: "Увеличить масштаб",
    dblClick: "Двойной щелчок по карте — приблизить к этой точке, с Shift — отдалить",
    dblClickTown: "Щелчок — выбрать город, двойной — приблизить к нему",
    zoomOut: "Уменьшить масштаб",
  },
  gestures: {
    "CooperativeGesturesHandler.WindowsHelpText": "Чтобы приблизить карту, прокручивайте с Ctrl",
    "CooperativeGesturesHandler.MacHelpText": "Чтобы приблизить карту, прокручивайте с ⌘",
    "CooperativeGesturesHandler.MobileHelpText": "Двигайте карту двумя пальцами",
  },
  zoomHint: "Приблизьте карту двумя пальцами — появятся посты на реках и обращения жителей.",
  loading: "Загружаем карту…",
  attribution:
    "© OpenStreetMap contributors · OpenFreeMap © OpenMapTiles · реки и границы стран Natural Earth · воздух CAMS / Open-Meteo",
  bounds: [27.25, 51.26, 31.8, 53.36] as [number, number, number, number],
  maxBounds: [25.8, 50.4, 33.6, 54.3] as [number, number, number, number],
  neighbours: [
    { label: "Могилёвская обл.", lon: 29.0, lat: 53.26 },
    { label: "Минская обл.", lon: 28.05, lat: 52.98 },
    { label: "Украина", lon: 31.25, lat: 51.78 },
    { label: "Россия", lon: 31.62, lat: 53.12 },
  ],
  neighbourTowns: [
    { name: "Могилёв", lon: 30.3449, lat: 53.9168 },
    { name: "Бобруйск", lon: 29.2214, lat: 53.1384 },
    { name: "Пинск", lon: 26.0951, lat: 52.1229 },
    { name: "Славутич", lon: 30.7504, lat: 51.5216 },
    { name: "Чернигов", lon: 31.2849, lat: 51.5055 },
    { name: "Новозыбков", lon: 31.936, lat: 52.537 },
    { name: "Клинцы", lon: 32.2361, lat: 52.7529 },
  ],
  riverLabels: [
    { name: "Березина", lon: 29.45, lat: 52.85, side: "right" },
    { name: "Припять", lon: 28.75, lat: 52.0, side: "below" },
    { name: "Сож", lon: 31.05, lat: 53.3, side: "right" },
    { name: "Днепр", lon: 30.7, lat: 51.7, side: "right" },
  ] as ReadonlyArray<{ name: string; lon: number; lat: number; side: "left" | "right" | "below" }>,
  labelsLeft: ["Гомель"] as readonly string[],
} as const
