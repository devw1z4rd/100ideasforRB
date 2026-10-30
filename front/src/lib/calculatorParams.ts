import { parseAmount, type Diet, type Fuel, type Inputs } from "./carbon"

// Состояние калькулятора в адресе страницы (?e=150&g=10&fl=IST*2,~1500*1&d=vegan): результатом можно поделиться ссылкой.
// Поля формы хранятся строками — так ввод «12,» не теряется на полпути.

export type FlightRow = { dest: string; km: string; trips: string }

export type FormState = {
  people: string
  electricity: string
  gas: string
  heat: string
  carKm: string
  carConsumption: string
  fuel: Fuel
  carPassengers: string
  busKm: string
  railKm: string
  diet: Diet
  flights: FlightRow[]
}

export const CUSTOM = "custom"

const numberKeys = {
  people: "p",
  electricity: "e",
  gas: "g",
  heat: "h",
  carKm: "ck",
  carConsumption: "cl",
  carPassengers: "cp",
  busKm: "b",
  railKm: "r",
} as const satisfies Partial<Record<keyof FormState, string>>

const fuels: readonly Fuel[] = ["petrol", "diesel", "lpg"]
const diets: readonly Diet[] = ["high_meat", "medium_meat", "low_meat", "fish", "vegetarian", "vegan"]

export const initialState: FormState = {
  people: "1",
  electricity: "",
  gas: "",
  heat: "",
  carKm: "",
  carConsumption: "",
  fuel: "petrol",
  carPassengers: "",
  busKm: "",
  railKm: "",
  diet: "medium_meat",
  flights: [],
}

// Перелёты: «IST*2» — направление и раз в год, «~1500*1» — своё расстояние в км
const encodeFlight = (f: FlightRow) => `${f.dest === CUSTOM ? `~${f.km}` : f.dest}*${f.trips}`
function decodeFlight(raw: string): FlightRow | null {
  const [where, trips = "1"] = raw.split("*")
  if (!where) return null
  return where.startsWith("~") ? { dest: CUSTOM, km: where.slice(1), trips } : { dest: where, km: "", trips }
}

export function readState(params: URLSearchParams): FormState {
  const state: FormState = { ...initialState, flights: [] }
  for (const [field, key] of Object.entries(numberKeys) as Array<[keyof typeof numberKeys, string]>) {
    const v = params.get(key)
    if (v !== null) state[field] = v
  }
  const fuel = params.get("f") as Fuel | null
  if (fuel && fuels.includes(fuel)) state.fuel = fuel
  const diet = params.get("d") as Diet | null
  if (diet && diets.includes(diet)) state.diet = diet
  state.flights = (params.get("fl") ?? "")
    .split(",")
    .map(decodeFlight)
    .filter((f): f is FlightRow => f !== null)
  return state
}

/** В адрес — только то, что отличается от начального состояния */
export function writeState(state: FormState): URLSearchParams {
  const params = new URLSearchParams()
  for (const [field, key] of Object.entries(numberKeys) as Array<[keyof typeof numberKeys, string]>) {
    if (state[field] !== initialState[field] && state[field] !== "") params.set(key, state[field])
  }
  if (state.fuel !== initialState.fuel) params.set("f", state.fuel)
  if (state.diet !== initialState.diet) params.set("d", state.diet)
  if (state.flights.length) params.set("fl", state.flights.map(encodeFlight).join(","))
  return params
}

/** Числа для расчёта; kmTo — расстояние до направления из списка */
export function toInputs(state: FormState, kmTo: (dest: string) => number): Inputs {
  return {
    people: parseAmount(state.people) || 1,
    electricity: parseAmount(state.electricity),
    gas: parseAmount(state.gas),
    heat: parseAmount(state.heat),
    carKm: parseAmount(state.carKm),
    carConsumption: parseAmount(state.carConsumption),
    fuel: state.fuel,
    carPassengers: parseAmount(state.carPassengers),
    busKm: parseAmount(state.busKm),
    railKm: parseAmount(state.railKm),
    diet: state.diet,
    flights: state.flights.map((f) => ({
      km: f.dest === CUSTOM ? parseAmount(f.km) : kmTo(f.dest),
      trips: parseAmount(f.trips),
    })),
  }
}
