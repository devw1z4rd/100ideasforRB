import type { FactSource } from "./hero"

// Страница «Данные и методика» (CLAUDE.md M7). Источники — из hero.factsSources (вводный абзац) и air.sources
// (раздел «Воздух»), enterprises.sourcesList (раздел «Предприятия»); позже страница перейдёт на коллекцию sources в PocketBase.
export const dataPage = {
  title: "Данные и методика",
  lead: "Откуда берутся цифры на сайте и как их читать. У каждого числа указаны источник и год, модельные данные подписаны как модельные.",
  sources: {
    title: "Источники данных",
    usedOn: "Главная, вводный абзац",
    airUsedOn: "Главная, раздел «Воздух»",
    enterprisesUsedOn: "Главная, раздел «Предприятия»",
  },
  aqi: {
    title: "Шкала индекса качества воздуха (AQI)",
    lead: "Индекс качества воздуха показывается по шкале Агентства по охране окружающей среды США (US EPA). Чем выше значение, тем опаснее воздух для здоровья.",
    source: {
      label: "Шкала AQI",
      title:
        "Technical Assistance Document for the Reporting of Daily Air Quality — the Air Quality Index (AQI)",
      publisher: "U.S. Environmental Protection Agency, EPA-403/B-26-003",
      url: "https://www.airnow.gov/publications/air-quality-index/technical-assistance-document-for-reporting-the-daily-aqi/",
      year: 2026,
    } satisfies FactSource,
  },
  principles: {
    title: "Как мы работаем с данными",
    items: [
      "У каждой цифры есть источник и год. Нет источника — цифра не публикуется.",
      "Модельные данные, например прогноз качества воздуха, подписываются как модельные.",
      "Разделы, для которых данных ещё нет, помечены «Раздел в разработке» — без демонстрационных цифр.",
    ],
  },
} as const
