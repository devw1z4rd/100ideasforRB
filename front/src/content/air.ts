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
  lead: "Как дышится в вашем городе. Каждый город и каждый день отдельно — одно среднее по области спрятало бы места и дни с плохим воздухом.",
  defaultTown: "Гомель",
  townLabel: "Город",
  nearMe: "Рядом со мной",
  nearMeError: "Не удалось определить местоположение",
  now: {
    title: "Сейчас",
    worst: "Хуже всего сейчас",
    best: "Лучше всего",
  },
  daysOver: (over: number, total: number) => `${over} из ${total}`,
  daysOverCaption: "дней выше нормы ВОЗ",
  previous: (n: number) => `в прошлый период: ${n}`,
  worstDay: "Худший день",
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
  },
  strip: {
    title: "Где и когда было выше нормы",
    lead: "Каждая клетка — сутки в городе. Нажмите на город, чтобы показать его на графике.",
    days: (n: number) => `${n} дн.`,
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
