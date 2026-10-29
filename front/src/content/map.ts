// Карта экологической обстановки (CLAUDE.md §10.4): подписи, слои, ориентиры.
// Координаты здесь — места подписей и ориентиров, не данные: данные карта берёт из PocketBase.

export type LngLat = { lon: number; lat: number }

export const map = {
  ariaLabel: "Карта Гомельской области",
  layers: {
    air: "Качество воздуха",
    reports: "Обращения жителей",
    water: "Реки: пункты наблюдений",
    problem: "Проблемные территории",
    enterprises: "Выбросы предприятий",
    oopt: "ООПТ",
  },
  overview: {
    title: "Воздух сейчас",
    good: (n: number, total: number) => `${n} из ${total}`,
    goodCaption: "городов с хорошим воздухом",
    scaleCaption: "каждая отметка — город, шкала AQI",
    worst: "Хуже всего",
    best: "Лучше всего",
    reports: "Обращения жителей",
    reportsOpen: "в работе",
    reportsResolved: "устранено",
  },
  card: {
    district: "Район",
    now: "Сейчас, мкг/м³",
    days30: "PM2.5 выше нормы ВОЗ за 30 дней",
    days: (n: number, total: number) => `${n} из ${total} дн.`,
    more: "Подробнее о воздухе",
    zoom: "Приблизить",
    prev: "Предыдущий город",
    next: "Следующий город",
    noData: "Нет свежих данных",
  },
  legend: {
    town: "Город, цвет — AQI сейчас",
    report: "Обращение жителя",
    water: "Участок реки, цвет — худший показатель",
    npp: "ЧАЭС",
    rivers: "Реки",
    labels: "Подписи городов",
    districts: "Границы районов",
  },
  water: {
    quarter: (q: string) => `Белгидромет, ${q}`,
    clean: "Отклонений от нормативов качества в обзоре нет",
    more: "Подробнее в разделе «Вода»",
  },
  controls: {
    oblast: "Вся область",
    zoomIn: "Увеличить масштаб",
    zoomOut: "Уменьшить масштаб",
  },
  gestures: {
    "CooperativeGesturesHandler.WindowsHelpText": "Чтобы приблизить карту, прокручивайте с Ctrl",
    "CooperativeGesturesHandler.MacHelpText": "Чтобы приблизить карту, прокручивайте с ⌘",
    "CooperativeGesturesHandler.MobileHelpText": "Двигайте карту двумя пальцами",
  },
  attribution: "Границы © OpenStreetMap contributors · реки Natural Earth · воздух CAMS / Open-Meteo",
  /** Рамка области (OSM relation 59161) — «Вся область»: запад, юг, восток, север */
  bounds: [27.25, 51.26, 31.8, 53.36] as [number, number, number, number],
  /** Дальше этой рамки карту не утащить */
  maxBounds: [25.8, 50.4, 33.6, 54.3] as [number, number, number, number],
  /** Подписи соседей — в видимой части карты, не под панелями */
  neighbours: [
    { label: "Могилёвская обл.", lon: 29.0, lat: 53.26 },
    { label: "Минская обл.", lon: 28.05, lat: 52.98 },
    { label: "Украина", lon: 29.0, lat: 51.3 },
  ],
  /**
   * Где подписать крупные реки: подпись «примагничивается» к ближайшей точке русла,
   * side — с какой стороны от точки (чтобы не наезжать на города)
   */
  riverLabels: [
    { name: "Березина", lon: 29.45, lat: 52.85, side: "right" },
    { name: "Припять", lon: 28.75, lat: 52.0, side: "below" },
    { name: "Сож", lon: 31.05, lat: 53.3, side: "right" },
    { name: "Днепр", lon: 30.7, lat: 51.7, side: "right" },
  ] as ReadonlyArray<{ name: string; lon: number; lat: number; side: "left" | "right" | "below" }>,
  /** Города с подписью слева от точки — справа тесно (у Гомеля справа Добруш) */
  labelsLeft: ["Гомель"] as readonly string[],
  /** Чернобыльская АЭС — ориентир наследия аварии 1986 года (§10.3) */
  npp: { label: "ЧАЭС", lon: 30.0992, lat: 51.389 },
} as const
