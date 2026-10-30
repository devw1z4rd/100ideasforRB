// Калькулятор углеродного следа (CLAUDE.md §4 S7): чистые расчёты, коэффициенты и их источники — content/calculator.ts.
// Всё в кг CO₂-экв. в год на одного человека.

export type Fuel = "petrol" | "diesel" | "lpg"
export type Diet = "high_meat" | "medium_meat" | "low_meat" | "fish" | "vegetarian" | "vegan"

export type Factors = {
  /** кг CO₂-экв. на кВт·ч электроэнергии */
  electricity: number
  /** кг CO₂-экв. на м³ природного газа */
  gas: number
  /** кг CO₂-экв. на Гкал тепла */
  heat: number
  /** кг CO₂-экв. на литр топлива */
  fuel: Record<Fuel, number>
  /** кг CO₂-экв. на пассажиро-км */
  bus: number
  rail: number
  flightShort: number
  flightLong: number
  /** Граница короткого и дальнего перелёта, км */
  longHaulFromKm: number
  /** кг CO₂-экв. в день */
  diet: Record<Diet, number>
}

export type Flight = { km: number; trips: number }

export type Inputs = {
  people: number
  /** кВт·ч в месяц на семью */
  electricity: number
  /** м³ в месяц на семью */
  gas: number
  /** Гкал в год на семью */
  heat: number
  /** км в месяц на машине */
  carKm: number
  /** л на 100 км */
  carConsumption: number
  fuel: Fuel
  /** Попутчиков в машине обычно, кроме вас: выбросы делятся на всех в машине */
  carPassengers: number
  /** км в неделю на автобусе */
  busKm: number
  /** км в год на поезде */
  railKm: number
  /** перелёты туда-обратно */
  flights: readonly Flight[]
  diet: Diet
}

export type Category = "home" | "car" | "transit" | "flights" | "food"
export type Footprint = Record<Category, number> & { total: number }

const WEEKS = 52
const MONTHS = 12
const DAYS = 365

const positive = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0)

/** Перелёт туда-обратно: два раза расстояние, коэффициент — по дальности перелёта в одну сторону */
export function flightKg(f: Flight, k: Factors): number {
  const km = positive(f.km)
  return 2 * km * positive(f.trips) * (km >= k.longHaulFromKm ? k.flightLong : k.flightShort)
}

export function footprint(i: Inputs, k: Factors): Footprint {
  const people = Math.max(1, Math.round(positive(i.people)) || 1)
  const home =
    (positive(i.electricity) * MONTHS * k.electricity +
      positive(i.gas) * MONTHS * k.gas +
      positive(i.heat) * k.heat) /
    people
  const litres = (positive(i.carKm) * MONTHS * positive(i.carConsumption)) / 100
  const car = (litres * k.fuel[i.fuel]) / (1 + Math.round(positive(i.carPassengers)))
  const transit = positive(i.busKm) * WEEKS * k.bus + positive(i.railKm) * k.rail
  const flights = i.flights.reduce((sum, f) => sum + flightKg(f, k), 0)
  const food = k.diet[i.diet] * DAYS
  return { home, car, transit, flights, food, total: home + car + transit + flights + food }
}

export type Suggestion = { key: string; saving: number }

/**
 * Что сильнее всего уменьшит след при этих вводных — только арифметика по тем же коэффициентам, от большего к меньшему.
 * Ключи совпадают с текстами в content/calculator.ts.
 */
export function suggestions(i: Inputs, k: Factors): Suggestion[] {
  const base = footprint(i, k).total
  const saving = (changed: Partial<Inputs>) => base - footprint({ ...i, ...changed }, k).total
  const longest = [...i.flights].filter((f) => f.trips > 0).sort((a, b) => flightKg(b, k) - flightKg(a, k))[0]

  const list: Suggestion[] = [
    // Половину поездок на машине — автобусом
    {
      key: "carToBus",
      saving: saving({ carKm: i.carKm / 2, busKm: i.busKm + (i.carKm / 2) * (MONTHS / WEEKS) }),
    },
    // На одну поездку туда-обратно меньше — самую «тяжёлую»
    {
      key: "oneFlightLess",
      saving: longest ? flightKg({ km: longest.km, trips: 1 }, k) : 0,
    },
    // Мяса меньше: на ступень ниже по рациону
    { key: "lessMeat", saving: saving({ diet: lessMeat[i.diet] }) },
    // Электричества на 10% меньше
    { key: "electricity10", saving: saving({ electricity: i.electricity * 0.9 }) },
    // Попутчик в машине
    { key: "carPool", saving: saving({ carPassengers: i.carPassengers + 1 }) },
  ]
  return list.filter((s) => s.saving >= 1).sort((a, b) => b.saving - a.saving)
}

const lessMeat: Record<Diet, Diet> = {
  high_meat: "medium_meat",
  medium_meat: "low_meat",
  low_meat: "vegetarian",
  fish: "vegetarian",
  vegetarian: "vegan",
  vegan: "vegan",
}

/** Расстояние по большому кругу, км (радиус Земли 6371,0088 км) */
export function greatCircleKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 2 * 6371.0088 * Math.asin(Math.sqrt(h))
}

/** "12,5" или "12.5" → 12.5; пусто и мусор → 0 */
export function parseAmount(value: string): number {
  const n = Number(value.replace(/\s/g, "").replace(",", "."))
  return Number.isFinite(n) && n > 0 ? n : 0
}
