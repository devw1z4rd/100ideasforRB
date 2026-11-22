import { isBelarusian, t } from "@/lib/locale"
import type { FactSource } from "./hero"

export type LngLat = { lon: number; lat: number }

const mapSources: readonly FactSource[] = [
  {
    label: t("Граница области, районы", "Мяжа вобласці і раёны"),
    title: t(
      "OpenStreetMap: граница Гомельской области, районы и г. Гомель",
      "OpenStreetMap: мяжа Гомельскай вобласці, раёны і г. Гомель",
    ),
    publisher: t("OpenStreetMap contributors, лицензия ODbL", "OpenStreetMap contributors, ліцэнзія ODbL"),
    url: "https://www.openstreetmap.org/copyright",
    year: 2026,
  },
  {
    label: t("Детали при приближении", "Дэталі пры набліжэнні"),
    title: t(
      "OpenFreeMap: векторные тайлы OpenMapTiles — лес, вода, дороги, деревни",
      "OpenFreeMap: вектарныя тайлы OpenMapTiles — лес, вада, дарогі, вёскі",
    ),
    publisher: t(
      "OpenFreeMap, OpenMapTiles; данные © OpenStreetMap contributors",
      "OpenFreeMap, OpenMapTiles; даныя © OpenStreetMap contributors",
    ),
    url: "https://openfreemap.org/",
    year: 2026,
  },
  {
    label: t("Реки, границы стран и областей", "Рэкі, межы краін і абласцей"),
    title: t(
      "Natural Earth 1:10m: реки, границы государств и областей",
      "Natural Earth 1:10m: рэкі, межы дзяржаў і абласцей",
    ),
    publisher: t("Natural Earth, общественное достояние", "Natural Earth, грамадскі набытак"),
    url: "https://www.naturalearthdata.com/",
    year: 2026,
  },
  {
    label: t("Координаты городов", "Каардынаты гарадоў"),
    title: t(
      "GeoNames: райцентры области и города соседей",
      "GeoNames: райцэнтры вобласці і суседнія гарады",
    ),
    publisher: t("GeoNames, лицензия CC BY 4.0", "GeoNames, ліцэнзія CC BY 4.0"),
    url: "https://www.geonames.org/",
    year: 2026,
  },
]

export const map = {
  ariaLabel: t("Карта Гомельской области", "Карта Гомельскай вобласці"),
  sources: mapSources,
  overview: {
    title: t("Воздух сейчас", "Паветра цяпер"),
    good: (n: number, total: number) => (isBelarusian ? `${n} з ${total}` : `${n} из ${total}`),
    of: (total: number) => (isBelarusian ? `з ${total}` : `из ${total}`),
    goodCaption: t("городов с хорошим воздухом", "гарадоў з добрым паветрам"),
    scaleCaption: t("каждая отметка — город, шкала AQI", "кожная адзнака — горад, шкала AQI"),
    worst: t("Хуже всего", "Найгоршае паветра"),
    best: t("Лучше всего", "Найлепшае паветра"),
    reports: t("Обращения жителей", "Звароты жыхароў"),
    reportsOpen: t("в работе", "у працы"),
    reportsResolved: t("устранено", "вырашана"),
  },
  card: {
    district: (name: string) => (isBelarusian ? `${name} раён` : `${name} район`),
    now: t("Сейчас, мкг/м³", "Цяпер, мкг/м³"),
    normMark: t("суточная норма ВОЗ", "сутачная норма СААЗ"),
    nowVsNorm: (value: string, norm: number) =>
      isBelarusian
        ? `цяпер ${value} · норма СААЗ ${norm} мкг/м³`
        : `сейчас ${value} · норма ВОЗ ${norm} мкг/м³`,
    daysTitle: t("Дни с PM2.5 выше суточной нормы ВОЗ", "Дні з перавышэннем сутачнай нормы СААЗ па PM2.5"),
    daysOf: (total: number) => (isBelarusian ? `з ${total}` : `из ${total}`),
    worstDay: t("Худший день", "Найгоршы дзень"),
    noDayData: t("нет данных", "няма даных"),
    stripLabel: t("PM2.5 по дням за 30 суток", "PM2.5 па днях за 30 сутак"),
    withinNorm: t("в пределах нормы", "у межах нормы"),
    more: t("Подробнее о воздухе", "Падрабязней пра паветра"),
    noData: t("Нет свежих данных", "Няма свежых даных"),
  },
  legend: {
    town: t("Город, цвет — AQI сейчас", "Горад, колер — бягучы AQI"),
    report: t("Обращение жителя", "Зварот жыхара"),
    level: t(
      "Пост на реке: уровень растёт / падает, цвет — к порогам поста",
      "Пост на рацэ: узровень расце / падае, колер — параўнанне з парогамі",
    ),
    water: t(
      "Участок реки, цвет — худший показатель качества",
      "Участак ракі, колер — найгоршы паказчык якасці",
    ),
  },
  riverDialog: {
    eyebrow: (date: string) =>
      isBelarusian
        ? `Узровень вады · Белгідрамет, на 8:00 ${date}`
        : `Уровень воды · Белгидромет, на 8:00 ${date}`,
    description: (river: string, post: string) =>
      isBelarusian
        ? `Узровень вады на пасце ${post} (${river}) за 30 дзён, парогі паста, іншыя пасты на рацэ і якасць вады`
        : `Уровень воды на посту ${post} (${river}) за 30 дней, пороги поста, другие посты на реке и качество воды`,
    expand: t("Развернуть: подробно о посте и реке", "Разгарнуць падрабязнасці пра пост і раку"),
    close: t("Закрыть", "Закрыць"),
    now: t("Уровень на 8:00", "Узровень на 8:00"),
    day: t("За сутки", "За суткі"),
    month: (days: number) => (isBelarusian ? `За ${days} дз.` : `За ${days} дн.`),
    thresholds: t("Пороги поста", "Парогі паста"),
    threshold: {
      low: t("Судоходный уровень", "Суднаходны ўзровень"),
      flood: t("Выход на пойму", "Выхад на пойму"),
      danger: t("Опасный уровень", "Небяспечны ўзровень"),
    },
    noThreshold: t("нет", "няма"),
    noThresholds: t(
      "У поста нет порогов судоходства, поймы и опасного уровня — уровень можно сравнивать только с его же прошлыми значениями.",
      "Для гэтага паста няма парогаў суднаходства, выхаду на пойму і небяспечнага ўзроўню. Параўноўваць узровень можна толькі з папярэднімі значэннямі на гэтым пасце.",
    ),
    relation: (kind: "low" | "flood" | "danger", diff: number) => {
      if (diff === 0) return t("ровно на пороге", "роўна на парозе")
      if (kind === "low")
        return diff < 0
          ? isBelarusian
            ? `на ${-diff} см ніжэй`
            : `на ${-diff} см ниже`
          : isBelarusian
            ? `на ${diff} см вышэй`
            : `на ${diff} см выше`
      return diff > 0
        ? isBelarusian
          ? `вышэй на ${diff} см`
          : `выше на ${diff} см`
        : isBelarusian
          ? `да яго ${-diff} см`
          : `до него ${-diff} см`
    },
    others: (river: string) =>
      isBelarusian ? `Іншыя пасты на рацэ ${river}` : `Другие посты на реке ${river}`,
    quality: (river: string, quarter: string) =>
      isBelarusian ? `Якасць вады: ${river} · ${quarter}` : `Качество воды: ${river} · ${quarter}`,
    source: t("Белгидромет, pogoda.by", "Белгідрамет, pogoda.by"),
    toSection: t("Раздел «Вода»", "Раздзел «Вада»"),
    chart: {
      max: "макс.",
      min: t("мин.", "мін."),
      changeCaption: t("столбики — изменение за сутки", "слупкі — змена за суткі"),
    },
  },
  tip: {
    level: t("Уровень воды", "Узровень вады"),
    water: t("Качество воды", "Якасць вады"),
    report: t("Обращение жителя", "Зварот жыхара"),
    place: {
      problem: t("Проблемная территория", "Праблемная тэрыторыя"),
      clean: t("Чистая локация", "Чыстае месца"),
      oopt: t("Особо охраняемая территория", "Асабліва ахоўная тэрыторыя"),
    },
    levelSource: (date: string) =>
      isBelarusian ? `Белгідрамет · ${date}, 8:00` : `Белгидромет · ${date}, 8:00`,
    waterSource: (quarter: string) =>
      isBelarusian ? `Белгідрамет · ${quarter}` : `Белгидромет · ${quarter}`,
    deviations: (n: number) => {
      const last = n % 10
      const word =
        n % 100 >= 11 && n % 100 <= 14
          ? t("отклонений", "адхіленняў")
          : last === 1
            ? t("отклонение", "адхіленне")
            : last >= 2 && last <= 4
              ? t("отклонения", "адхіленні")
              : t("отклонений", "адхіленняў")
      return `${n} ${word}`
    },
    clean: t("в норме", "у норме"),
    ratioHint: (ratio: string) =>
      isBelarusian
        ? `×${ratio} — у ${ratio} раза вышэй за нарматыў`
        : `×${ratio} — в ${ratio} раза хуже норматива`,
    more: t("Подробнее", "Падрабязней"),
  },
  levels: {
    asOf: (date: string) => (isBelarusian ? `Белгідрамет, ${date}, 8:00` : `Белгидромет, ${date}, 8:00`),
  },
  water: {
    quarter: (q: string) => (isBelarusian ? `Белгідрамет, ${q}` : `Белгидромет, ${q}`),
    clean: t(
      "Отклонений от нормативов качества в обзоре нет",
      "У аглядзе няма адхіленняў ад нарматываў якасці",
    ),
    more: t("Подробнее в разделе «Вода»", "Падрабязней у раздзеле «Вада»"),
  },
  controls: {
    oblast: t("Вся область", "Уся вобласць"),
    zoomIn: t("Увеличить масштаб", "Павялічыць маштаб"),
    dblClick: t(
      "Двойной щелчок по карте — приблизить к этой точке, с Shift — отдалить",
      "Падвойная пстрычка па карце набліжае пункт, з Shift — аддаляе",
    ),
    dblClickTown: t(
      "Щелчок — выбрать город, двойной — приблизить к нему",
      "Пстрычка выбірае горад, падвойная — набліжае яго",
    ),
    zoomOut: t("Уменьшить масштаб", "Паменшыць маштаб"),
  },
  gestures: {
    "CooperativeGesturesHandler.WindowsHelpText": t(
      "Чтобы приблизить карту, прокручивайте с Ctrl",
      "Каб наблізіць карту, пракручвайце з Ctrl",
    ),
    "CooperativeGesturesHandler.MacHelpText": t(
      "Чтобы приблизить карту, прокручивайте с ⌘",
      "Каб наблізіць карту, пракручвайце з ⌘",
    ),
    "CooperativeGesturesHandler.MobileHelpText": t(
      "Двигайте карту двумя пальцами",
      "Рухайце карту двума пальцамі",
    ),
  },
  zoomHint: t(
    "Приблизьте карту двумя пальцами — появятся посты на реках и обращения жителей.",
    "Наблізьце карту двума пальцамі, каб убачыць пасты на рэках і звароты жыхароў.",
  ),
  loading: "Загружаем карту…",
  attribution: t(
    "© OpenStreetMap contributors · OpenFreeMap © OpenMapTiles · реки и границы стран Natural Earth · воздух CAMS / Open-Meteo",
    "© OpenStreetMap contributors · OpenFreeMap © OpenMapTiles · рэкі і межы краін Natural Earth · паветра CAMS / Open-Meteo",
  ),
  bounds: [27.25, 51.26, 31.8, 53.36] as [number, number, number, number],
  maxBounds: [25.8, 50.4, 33.6, 54.3] as [number, number, number, number],
  neighbours: [
    { label: t("Могилёвская обл.", "Магілёўская вобл."), lon: 29.0, lat: 53.26 },
    { label: t("Минская обл.", "Мінская вобл."), lon: 28.05, lat: 52.98 },
    { label: t("Украина", "Украіна"), lon: 31.25, lat: 51.78 },
    { label: t("Россия", "Расія"), lon: 31.62, lat: 53.12 },
  ],
  neighbourTowns: [
    { name: t("Могилёв", "Магілёў"), lon: 30.3449, lat: 53.9168 },
    { name: t("Бобруйск", "Бабруйск"), lon: 29.2214, lat: 53.1384 },
    { name: t("Пинск", "Пінск"), lon: 26.0951, lat: 52.1229 },
    { name: t("Славутич", "Славуціч"), lon: 30.7504, lat: 51.5216 },
    { name: t("Чернигов", "Чарнігаў"), lon: 31.2849, lat: 51.5055 },
    { name: t("Новозыбков", "Навазыбкаў"), lon: 31.936, lat: 52.537 },
    { name: t("Клинцы", "Клінцы"), lon: 32.2361, lat: 52.7529 },
  ],
  riverLabels: [
    { name: "Березина", label: t("Березина", "Бярэзіна"), lon: 29.45, lat: 52.85, side: "right" },
    { name: "Припять", label: t("Припять", "Прыпяць"), lon: 28.75, lat: 52.0, side: "below" },
    { name: "Сож", label: "Сож", lon: 31.05, lat: 53.3, side: "right" },
    { name: "Днепр", label: t("Днепр", "Дняпро"), lon: 30.7, lat: 51.7, side: "right" },
  ] as ReadonlyArray<{ name: string; label: string; lon: number; lat: number; side: "left" | "right" | "below" }>,
  labelsLeft: ["Гомель"] as readonly string[],
} as const
