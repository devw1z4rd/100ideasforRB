import type { Diet, Factors, Fuel } from "@/lib/carbon"
import type { FactSource } from "./hero"

// Калькулятор углеродного следа (CLAUDE.md §4 S7, §11 /calculator). У каждого коэффициента — источник и год (§3).

const desnz: FactSource = {
  label: "Топливо, газ, автобус, поезд, самолёт",
  title: "Greenhouse gas reporting: conversion factors 2025",
  publisher: "Министерство энергетической безопасности и нулевых выбросов Великобритании (DESNZ)",
  url: "https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025",
  year: 2025,
}

const grid: FactSource = {
  label: "Электроэнергия в Беларуси",
  title: "Carbon intensity of electricity generation — Belarus (данные Ember и Energy Institute)",
  publisher: "Our World in Data",
  url: "https://ourworldindata.org/grapher/carbon-intensity-electricity?tab=chart&country=BLR",
  year: 2025,
}

const diets: FactSource = {
  label: "Питание",
  title:
    "Scarborough P. et al. Dietary greenhouse gas emissions of meat-eaters, fish-eaters, vegetarians and vegans in the UK. Climatic Change 125, 179–192",
  publisher: "Оксфордский университет",
  url: "https://doi.org/10.1007/s10584-014-1169-1",
  year: 2014,
}

const target: FactSource = {
  label: "Цель для 1,5 °C",
  title: "1.5-Degree Lifestyles: Targets and options for reducing lifestyle carbon footprints",
  publisher: "IGES, Aalto University, D-mat",
  url: "https://www.iges.or.jp/en/pub/15-degrees-lifestyles-2019/en",
  year: 2019,
}

const airports: FactSource = {
  label: "Расстояния перелётов",
  title: "OurAirports: координаты аэропортов (общественное достояние)",
  publisher: "OurAirports",
  url: "https://ourairports.com/data/",
  year: 2026,
}

/**
 * Коэффициенты, кг CO₂-экв.
 * DESNZ 2025: природный газ на м³; бензин и дизель без биодобавок (100% mineral), сжиженный газ — на литр;
 * автобус — Average local bus, поезд — National rail; самолёт — эконом-класс с учётом высотного эффекта (with RF),
 * короткий перелёт — до 3700 км, дальний — от 3700 км (граница DESNZ).
 * Электроэнергия: углеродоёмкость выработки в Беларуси, 2025 — 309,25 г/кВт·ч (Ember через Our World in Data).
 * Тепло: 1 Гкал = 1163 кВт·ч, как если бы его получили сжиганием природного газа без потерь
 * (DESNZ 2025, газ на кВт·ч по низшей теплоте сгорания — 0,2027) — оценка снизу.
 * Питание: Scarborough et al. 2014, кг CO₂-экв. в день (с поправкой на пол и возраст).
 */
export const factors: Factors = {
  electricity: 0.30925,
  gas: 2.06672,
  heat: 1163 * 0.2027,
  fuel: { petrol: 2.33984, diesel: 2.66155, lpg: 1.55713 },
  bus: 0.10385,
  rail: 0.03546,
  flightShort: 0.12576,
  flightLong: 0.11704,
  longHaulFromKm: 3700,
  diet: {
    high_meat: 7.19,
    medium_meat: 5.63,
    low_meat: 4.67,
    fish: 3.91,
    vegetarian: 3.81,
    vegan: 2.89,
  },
}

/** Направления из Минска (координаты аэропортов — OurAirports) */
export const destinations: ReadonlyArray<{ id: string; label: string; lat: number; lon: number }> = [
  { id: "SVO", label: "Москва", lat: 55.9775, lon: 37.3867 },
  { id: "LED", label: "Санкт-Петербург", lat: 59.8003, lon: 30.2625 },
  { id: "KZN", label: "Казань", lat: 55.6062, lon: 49.2787 },
  { id: "IST", label: "Стамбул", lat: 41.2749, lon: 28.7321 },
  { id: "BUS", label: "Батуми", lat: 41.6094, lon: 41.6003 },
  { id: "TBS", label: "Тбилиси", lat: 41.6692, lon: 44.9547 },
  { id: "AYT", label: "Анталья", lat: 36.8987, lon: 30.8005 },
  { id: "EVN", label: "Ереван", lat: 40.1489, lon: 44.3979 },
  { id: "SSH", label: "Шарм-эш-Шейх", lat: 27.9773, lon: 34.3947 },
  { id: "HRG", label: "Хургада", lat: 27.1768, lon: 33.7967 },
  { id: "TAS", label: "Ташкент", lat: 41.2579, lon: 69.2812 },
  { id: "DXB", label: "Дубай", lat: 25.2498, lon: 55.371 },
  { id: "PEK", label: "Пекин", lat: 40.0773, lon: 116.5967 },
  { id: "BKK", label: "Бангкок", lat: 13.6811, lon: 100.747 },
]

export const minskAirport = { lat: 53.8881, lon: 28.04 }

export const fuelLabels: Record<Fuel, string> = {
  petrol: "Бензин",
  diesel: "Дизель",
  lpg: "Газ (ГБО)",
}

export const dietOptions: ReadonlyArray<{ key: Diet; label: string; hint: string }> = [
  { key: "high_meat", label: "Много мяса", hint: "100 г в день и больше" },
  { key: "medium_meat", label: "Мясо каждый день", hint: "50–99 г в день" },
  { key: "low_meat", label: "Мясо иногда", hint: "меньше 50 г в день" },
  { key: "fish", label: "Рыба без мяса", hint: "" },
  { key: "vegetarian", label: "Вегетарианское", hint: "молочное и яйца — да" },
  { key: "vegan", label: "Веганское", hint: "без продуктов животного происхождения" },
]

/** Цели «образа жизни 1,5 °C» на человека в год, т CO₂-экв. (IGES 2019) */
export const targets = [
  { year: 2030, t: 2.5 },
  { year: 2040, t: 1.4 },
  { year: 2050, t: 0.7 },
] as const

export const calculator = {
  title: "Калькулятор углеродного следа",
  lead: "Сколько парниковых газов в год приходится на вас: дом, поездки, перелёты и питание. Введите цифры из счетов и привычек — результат пересчитывается сразу и сохраняется в адресе страницы, им можно поделиться.",
  sections: {
    home: {
      title: "Дом",
      hint: "Цифры на всю семью — делим на число людей. Возьмите из расчётной книжки или ЕРИП.",
    },
    transport: { title: "Поездки" },
    flights: {
      title: "Перелёты за год",
      hint: "Туда и обратно из Минска. Расстояние — по прямой между аэропортами.",
    },
    food: { title: "Питание" },
  },
  fields: {
    people: { label: "Человек в семье", unit: "" },
    electricity: { label: "Электроэнергия", unit: "кВт·ч в месяц" },
    gas: { label: "Природный газ", unit: "м³ в месяц", hint: "плита, колонка, котёл" },
    heat: { label: "Центральное отопление", unit: "Гкал за год", hint: "сумма за отопительный сезон" },
    carKm: { label: "На машине", unit: "км в месяц" },
    carConsumption: { label: "Расход", unit: "л на 100 км", placeholder: "например, 8" },
    fuel: { label: "Топливо" },
    carPassengers: { label: "Попутчиков обычно", unit: "кроме вас" },
    busKm: { label: "Автобус и маршрутка", unit: "км в неделю" },
    railKm: { label: "Поезд и электричка", unit: "км в год" },
    destination: { label: "Куда" },
    trips: { label: "Раз в год" },
    customKm: "Другое направление",
    customKmUnit: "км в одну сторону",
    addFlight: "Добавить перелёт",
    removeFlight: "Убрать перелёт",
  },
  needConsumption: "Укажите расход, чтобы посчитать машину.",
  result: {
    title: "Ваш след",
    unit: "т CO₂-экв. в год",
    categories: {
      home: "Дом",
      car: "Машина",
      transit: "Автобус и поезд",
      flights: "Перелёты",
      food: "Питание",
    },
    target: (year: number, t: string) => `цель ${year}: ${t} т`,
    targetCaption:
      "Чтобы удержать потепление в пределах 1,5 °C, след одного человека должен снизиться до 2,5 т к 2030 году, 1,4 т к 2040-му и 0,7 т к 2050-му.",
    vsTarget: (times: string) => `в ${times} раза больше цели 2030 года`,
    belowTarget: "меньше цели 2030 года",
    suggestionsTitle: "Что даст больше всего",
    suggestions: {
      carToBus: "Половину поездок на машине — автобусом",
      oneFlightLess: "На один самый дальний перелёт туда-обратно меньше",
      lessMeat: "Меньше мяса — на ступень ниже по рациону",
      electricity10: "На 10% меньше электроэнергии",
      carPool: "Ещё один попутчик в машине",
    } as Record<string, string>,
    saving: (kg: string) => `−${kg} кг в год`,
    reset: "Сбросить",
    details: "Подробнее",
    share: "Скопировать ссылку",
    copied: "Ссылка скопирована",
  },
  note: "Оценка, а не точный расчёт. Не учтены покупки, одежда, техника и услуги — в исследовании IGES питание, жильё и транспорт дают около трёх четвертей следа, остальное — товары и услуги. Коэффициенты для топлива и транспорта — средние по Великобритании (для Беларуси официальных нет), электроэнергия — по выработке в Беларуси. Тепло посчитано как если бы его получили из природного газа без потерь, поэтому это оценка снизу. Троллейбус и трамвай не учитываются: для них нет проверенного коэффициента.",
  methodTitle: "Как считаем",
  method: [
    "Электроэнергия: 309 г CO₂-экв. на кВт·ч — углеродоёмкость выработки электроэнергии в Беларуси в 2025 году (Ember через Our World in Data).",
    "Газ: 2,07 кг на м³; бензин: 2,34 кг на литр, дизель: 2,66, сжиженный газ: 1,56 (DESNZ, 2025).",
    "Отопление: 1 Гкал = 1163 кВт·ч тепла, получено из газа без потерь — 236 кг на Гкал.",
    "Машина: километры × расход → литры × коэффициент топлива; выбросы делятся на всех в машине.",
    "Автобус: 0,104 кг на пассажиро-километр; поезд: 0,035 (DESNZ, 2025, средние по Великобритании).",
    "Самолёт, эконом-класс, с учётом высотного эффекта: 0,126 кг на пассажиро-километр для перелётов до 3700 км и 0,117 — для более дальних (DESNZ, 2025).",
    "Питание: от 7,19 кг в день при большом количестве мяса до 2,89 у веганов (Scarborough и др., 2014).",
  ],
  sources: [grid, desnz, diets, target, airports] as const,
} as const
