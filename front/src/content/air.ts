import type { Period, Pollutant } from "@/lib/airStats"
import { formatNumber } from "@/lib/format"
import type { FactSource } from "./hero"

// Секция «Воздух» на главной (CLAUDE.md §10.6) и её методика на странице «Данные и методика».

const who: FactSource = {
  label: "Нормы ВОЗ",
  title:
    "WHO global air quality guidelines: particulate matter (PM2.5 and PM10), ozone, nitrogen dioxide, sulfur dioxide and carbon monoxide",
  publisher: "Всемирная организация здравоохранения",
  url: "https://www.who.int/publications/i/item/9789240034228",
  year: 2021,
}

const openMeteo: FactSource = {
  label: "Качество воздуха, модель CAMS",
  title: "Open-Meteo Air Quality API",
  publisher: "Open-Meteo; Copernicus Atmosphere Monitoring Service",
  url: "https://open-meteo.com/en/docs/air-quality-api",
  year: 2026,
}

export type PollutantInfo = {
  key: Pollutant
  label: string
  /** Что это простыми словами */
  hint: string
  /** Суточная рекомендация ВОЗ 2021, мкг/м³ (среднее за 24 часа) */
  norm: number
}

export const pollutants: readonly PollutantInfo[] = [
  { key: "pm2_5", label: "PM2.5", hint: "мелкая пыль и сажа, проникает глубоко в лёгкие", norm: 15 },
  { key: "pm10", label: "PM10", hint: "пыль, пыльца, частицы от дорог и стройки", norm: 45 },
  { key: "no2", label: "NO₂", hint: "диоксид азота — выхлопы и котельные", norm: 25 },
  { key: "so2", label: "SO₂", hint: "диоксид серы — сжигание угля и мазута, промышленность", norm: 40 },
]

export const periods: ReadonlyArray<{ key: Period; label: string; short: string }> = [
  { key: "7d", label: "7 дней", short: "за 7 дней" },
  { key: "30d", label: "30 дней", short: "за 30 дней" },
  { key: "90d", label: "90 дней", short: "за 90 дней" },
  { key: "ytd", label: "С начала года", short: "с начала года" },
]

export const levelLabels = {
  ok: "в пределах нормы ВОЗ",
  elevated: "выше нормы, до 2 раз",
  high: "выше нормы более чем в 2 раза",
} as const

export const air = {
  lead: "Чем дышат в городах области: сейчас, день за днём, по часам суток и в прогнозе на ближайшие дни. Каждый город — отдельно: одно среднее по области спрятало бы места и дни с плохим воздухом.",
  defaultTown: "Гомель",
  townLabel: "Город",
  periodLabel: "Период",
  nearMe: "Рядом со мной",
  nearMeError: "Не удалось определить местоположение",
  /** Подсказка к кнопке «Рядом со мной» на десктопе */
  nearMeHint: "Ближайший город по геолокации. Координаты остаются в браузере.",
  /** Подпись справа в списке городов: AQI сейчас */
  townAqi: "AQI сейчас",
  /** Сводка города в виде «По городу»: AQI и четыре показателя одной панелью */
  summary: {
    at: (hour: string) => `сейчас · ${hour}:00`,
    noNow: "нет данных за последний час",
    /** Скобка на шкале AQI: пределы за период по худшему часу суток */
    spread: (days: number) => `за ${days} дн. —`,
    spreadValues: (min: number, max: number) => `от ${min} до ${max}`,
    aqiVsWho:
      "AQI — американская шкала: она строже нормы ВОЗ и берёт худший час суток. Поэтому «умеренный» AQI бывает и в дни, когда среднее за сутки в пределах нормы ВОЗ.",
    pollutantsLabel: "Показатель для графика",
    /** Заголовки над плашкой AQI и над карточками показателей — на одной линии */
    aqiTitle: "Индекс качества воздуха",
    pickTitle: "Дни выше суточной нормы ВОЗ",
    norm: (n: number) => `норма ${n}`,
    of: (total: number) => `из ${total} дн.`,
    over: "выше нормы ВОЗ",
    worst: (day: string) => `Худший день ${day}:`,
    previous: (n: number) => `в прошлый период — ${n}`,
  },
  daysOver: (over: number, total: number) => `${over} из ${total}`,
  daysOverCaption: "дней выше нормы ВОЗ",
  /** Насколько выше нормы — как говорят люди: «на 12% выше нормы», «в 2,1 раза выше нормы» */
  aboveNorm: (value: number, norm: number) => {
    const ratio = value / norm
    return ratio < 2
      ? `на ${Math.max(1, Math.round((ratio - 1) * 100))}% выше нормы`
      : `в ${formatNumber(ratio, 1)} раза выше нормы`
  },
  chart: {
    town: (name: string) => `${name}, среднее за сутки`,
    band: "разброс по всем городам области",
    norm: "суточная норма ВОЗ",
    unit: "мкг/м³",
    // Без глаголов прошедшего времени: у названий городов разный род (Гомель, Ветка, Хойники, Буда-Кошелёво)
    rank: (town: string, worst: number, best: number, total: number) =>
      worst > 0
        ? `${town} — самый загрязнённый город области в ${worst} из ${total} дней${best > 0 ? `, самый чистый — в ${best}` : ""}.`
        : best > 0
          ? `${town} — самый чистый город области в ${best} из ${total} дней, самый загрязнённый — ни разу.`
          : `${town} — ни разу не самый загрязнённый и не самый чистый город области за период.`,
    range: (min: string, minTown: string, max: string, maxTown: string) =>
      `По области: от ${min} (${minTown}) до ${max} (${maxTown})`,
    normShort: (norm: number) => `норма ВОЗ ${norm}`,
    twoNorms: "2 нормы",
    max: (value: string, day: string) => `макс. ${value} · ${day}`,
    noData: (town: string) => `${town}: нет данных`,
    /** Данные начинаются позже начала периода (история ещё не загружена) */
    dataFrom: (day: string) => `данные с ${day}`,
    /** Незавершённая точка «сегодня»: среднее за прошедшие часы, в подсчёт дней не входит */
    today: "сегодня — сутки ещё идут",
    todayTip: (hours: number) => `Сегодня, за ${hours} ч из 24`,
    todayNote: "Сутки не закончились: значение изменится, в подсчёт дней не входит",
  },
  views: {
    label: "Вид",
    town: "По городу",
    table: "Таблица",
    forecast: "Прогноз",
    hours: "По часам",
  },
  /** Вид «Прогноз»: почасовой прогноз AQI на ~5 дней и лучшее время для прогулки */
  forecast: {
    eyebrow: (town: string) => `Лучшее время для прогулки · ${town}`,
    today: "Сегодня",
    tomorrow: "Завтра",
    window: (range: string) => range,
    aqiUpTo: (aqi: number, label: string) => `AQI до ${aqi} · ${label}`,
    todayWindow: (range: string, aqi: number) => `Сегодня — ${range}, AQI до ${aqi}`,
    todayNone: "Сегодня подходящих часов уже не осталось",
    worst: (when: string, aqi: number, label: string) =>
      `Хуже всего в ближайшие двое суток — ${when}: AQI ${aqi}, ${label}`,
    gridTitle: "AQI по часам",
    gridHint:
      "Каждая клетка — час, цвет — категория AQI. Рамкой — лучшее время для прогулки сегодня и завтра.",
    dayMax: "макс.",
    cell: (day: string, hour: string, aqi: number, label: string, pm: string, past: boolean) =>
      `${day}, ${hour} · AQI ${aqi} — ${label} · PM2.5 ${pm} мкг/м³${past ? " · факт" : " · прогноз"}`,
    now: "сейчас",
    empty: "Прогноза для этого города пока нет — cron загрузит его в течение часа.",
    note: "Прогноз модели CAMS / Open-Meteo для центра города, пересчитывается каждый час; чем дальше день, тем ниже точность. Прошедшие часы сегодня — фактические модельные значения (бледнее). Окно для прогулки — три часа подряд между 8:00 и 22:00 с самым низким AQI.",
  },
  /** Вид «По часам»: средний профиль суток по выбранному показателю */
  hours: {
    title: (town: string, pollutant: string) => `Время суток: ${town} · ${pollutant}`,
    filters: { all: "Все дни", weekdays: "Будни", weekends: "Выходные" },
    filterLabel: "Какие дни",
    pollutantLabel: "Показатель",
    worst: "Хуже всего",
    best: "Лучше всего",
    ratio: (r: string) => `Разница между худшими и лучшими часами — в ${r} раза`,
    partsTitle: "По частям суток",
    parts: [
      { label: "Ночь", from: 0, to: 6 },
      { label: "Утро", from: 6, to: 12 },
      { label: "День", from: 12, to: 18 },
      { label: "Вечер", from: 18, to: 24 },
    ],
    centerDay: "в среднем за сутки",
    centerOver: (share: number) => `выше нормы в ${share}% дней`,
    normRing: "норма ВОЗ",
    /** Норма намного выше всех часов — кольцо нормы не рисуется, масштаб по данным */
    normFar: (norm: number) => `все часы намного ниже нормы ВОЗ (${norm} мкг/м³)`,
    now: "сейчас",
    capped: "Почасовые данные хранятся 90 дней — показаны последние 90.",
    empty: "Почасовых данных за этот период нет.",
    note: "Средние почасовые модельные значения CAMS / Open-Meteo за период, время — по Минску. Норма ВОЗ задана для среднесуточной концентрации — на часах она ориентир, а не превышение.",
  },
  table: {
    title: (period: string) => `Все города области ${period}`,
    lead: "Сколько суток среднесуточная концентрация была выше нормы ВОЗ. Нажмите на город, чтобы открыть его график.",
    label: "Города области: дни выше нормы ВОЗ по показателям",
    town: "Город",
    aqi: "AQI сейчас",
    aqiShort: "AQI",
    norm: (n: number) => `норма ${n}`,
    max: (value: string) => `макс. ${value}`,
    /** Подсказка к клетке: сколько дней и худшие сутки */
    cell: (over: number, total: number, day: string, value: string) =>
      `${over} из ${total} дн. выше нормы; худшие сутки — ${day}: ${value} мкг/м³`,
    open: (town: string) => `Открыть ${town} на графике`,
    legend: {
      elevated: "худшие сутки — до 2 норм",
      high: "худшие сутки — больше 2 норм",
    },
  },
  strip: {
    title: "Где и когда было выше нормы",
    lead: "Каждая клетка — сутки в городе. Нажмите на город, чтобы показать его на графике.",
    leadWeeks:
      "Каждая клетка — неделя в городе, цвет — по худшим суткам недели. Нажмите на город, чтобы показать его на графике.",
    days: (n: number) => `${n} дн.`,
    hint: (label: string, norm: number) => `${label}, норма ВОЗ ${norm} мкг/м³ в сутки`,
    week: (from: string, to: string) => `Неделя ${from} — ${to}`,
    /** День: «выше нормы в 6 из 21 городов»; неделя: «хотя бы одни сутки выше нормы в 6 из 21 городов» */
    overTowns: (n: number, total: number, week: boolean) =>
      `${week ? "хотя бы одни сутки выше нормы" : "выше нормы"} в ${n} из ${total} городов`,
    townDay: (town: string, value: string) => `${town} — ${value} мкг/м³`,
    townWeek: (town: string, over: number, total: number, max: string) =>
      `${town} — ${over} из ${total} сут. выше нормы, макс. ${max} мкг/м³`,
  },
  empty: "Данных за этот период пока нет.",
  error: "Не удалось загрузить данные о воздухе.",
  note: "Модельные данные CAMS / Open-Meteo, сетка около 10 км: значение для города — расчёт для его центра, не замер поста. Норма — рекомендация ВОЗ 2021 для среднесуточной концентрации; ВОЗ допускает её превышение 3–4 дня в год.",
  methodology: {
    title: "Как читать раздел «Воздух»",
    items: [
      "Данные — модельный расчёт CAMS через Open-Meteo для центра каждого из 21 города области, обновляются раз в час. Это не замеры постов Белгидромета.",
      "Сутки считаются по минскому времени; в сравнение идут только сутки, где есть не меньше 18 часов данных.",
      "Норма — суточная рекомендация ВОЗ 2021 года: PM2.5 — 15, PM10 — 45, NO₂ — 25, SO₂ — 40 мкг/м³. ВОЗ допускает превышение 3–4 дня в год.",
      "Мы не показываем одно среднее по области: оно прячет города и дни с плохим воздухом. Вместо этого — выбранный город, разброс по всем городам и число дней выше нормы.",
    ],
  },
  sources: [openMeteo, who] as const,
} as const
