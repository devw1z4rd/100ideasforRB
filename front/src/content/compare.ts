import type { CompareState, RankMetric } from "@/lib/compare"
import type { Period } from "@/lib/airStats"
import type { FactSource } from "./hero"

const osm: FactSource = {
  label: "Границы районов",
  title: "OpenStreetMap: границы районов Гомельской области и г. Гомеля",
  publisher: "OpenStreetMap contributors, лицензия ODbL",
  url: "https://www.openstreetmap.org/copyright",
  year: 2026,
}

export const districtLabel = (name: string) => (name.startsWith("г. ") ? name : `${name} район`)

export type MetricInfo = { key: RankMetric; label: string; caption: string }

export const metrics: readonly MetricInfo[] = [
  { key: "pm2_5", label: "PM2.5", caption: "дней выше нормы ВОЗ" },
  { key: "pm10", label: "PM10", caption: "дней выше нормы ВОЗ" },
  { key: "no2", label: "NO₂", caption: "дней выше нормы ВОЗ" },
  { key: "so2", label: "SO₂", caption: "дней выше нормы ВОЗ" },
  { key: "reports", label: "Обращения жителей", caption: "опубликованных обращений" },
]

export const comparePeriods: readonly Period[] = ["30d", "90d", "ytd"]

export const compare = {
  title: "Сравнение районов",
  lead: "21 район и Гомель на одних и тех же данных: воздух, реки, качество воды, обращения жителей. Выберите показатель — районы выстроятся по нему. Выберите два района — и сравните их по всему, что есть на сайте.",
  defaults: { metric: "pm2_5", period: "90d", a: "г. Гомель", b: "Мозырский" } satisfies CompareState,
  ranking: {
    title: "Районы по одному показателю",
    metricLabel: "Показатель",
    most: (metric: MetricInfo) =>
      metric.key === "reports" ? "Больше всего обращений" : `Чаще всего ${metric.label} выше нормы ВОЗ`,
    least: "Реже всего",
    leastReports: "Меньше всего",
    none: (metric: MetricInfo, period: string) =>
      metric.key === "reports"
        ? `Опубликованных обращений ${period} нет ни в одном районе.`
        : `${metric.label} не превышал норму ВОЗ ${period} ни в одном районе.`,
    value: (metric: MetricInfo, n: number) => (metric.key === "reports" ? `${n}` : `${n} дн.`),
    of: (total: number) => `из ${total}`,
    noData: "нет данных",
    hint: (a: string) => `Нажмите на район — он встанет в сравнение вторым. Первый — ${a}.`,
    toPair: "К сравнению ↓",
    legendTown: "райцентр — точка, для которой модель считает воздух",
    mapLabel: (metric: MetricInfo) => `Картограмма районов: ${metric.label}, ${metric.caption}`,
    airNote:
      "Воздух района — модельный расчёт CAMS / Open-Meteo для его райцентра, не замер поста. У Гомельского района отдельной точки нет: его райцентр — сам Гомель.",
    reportsNote:
      "Обращения относятся к району по точке на карте; учитываются опубликованные — принятые, переданные и устранённые.",
    attribution: "Границы © OpenStreetMap contributors",
  },
  pair: {
    title: "Два района рядом",
    first: "Район",
    second: "С каким сравнить",
    swap: "Поменять местами",
    nearMe: "Мой район",
    nearMeError: "Не удалось определить местоположение",
    outside: "Вы не в Гомельской области",
    air: {
      title: "Воздух",
      aqiNow: "Индекс AQI сейчас",
      daysOver: (label: string, norm: number) => `${label} · дней выше нормы ВОЗ (${norm} мкг/м³)`,
      of: (total: number) => `из ${total}`,
      worst: (day: string, value: string) => `худший: ${day}, ${value}`,
    },
    rivers: {
      title: "Реки: уровень воды",
      asOf: (date: string) => `Белгидромет, ${date}, 8:00`,
      none: "Постов Белгидромета в районе нет",
      more: "Подробнее в разделе «Вода»",
    },
    water: {
      title: "Качество воды",
      none: "Пунктов наблюдения в обзоре нет",
      clean: "отклонений от нормативов нет",
      worse: (indicator: string, ratio: string) => `${indicator} — в ${ratio} раза хуже норматива`,
      more: (n: number) => `и ещё ${n}`,
    },
    reports: {
      title: "Обращения жителей",
      total: "Опубликовано",
      open: "В работе",
      resolved: "Устранено",
      none: "Опубликованных обращений за период нет ни в одном из двух районов.",
      cta: "Сообщить о проблеме",
    },
  },
  whyNoIndex: {
    title: "Почему нет общего места «самый экологичный район»",
    text: "Воздух, реки и обращения измеряются в разных единицах, и любые веса для их сложения в один балл были бы нашим произволом. Поэтому каждый показатель — отдельно, со своим источником.",
  },
  methodology: "Источники и методика — на странице «Данные и методика».",
  loading: "Загружаем данные районов…",
  error: "Не удалось загрузить данные районов.",
  empty: "Данных о воздухе за этот период пока нет.",
  sources: [osm] as const,
}
