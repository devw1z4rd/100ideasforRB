import { describe, expect, it } from "vitest"
import { destinations, factors, minskAirport } from "@/content/calculator"
import { flightKg, footprint, greatCircleKm, parseAmount, suggestions, type Inputs } from "./carbon"

const empty: Inputs = {
  people: 1,
  electricity: 0,
  gas: 0,
  heat: 0,
  carKm: 0,
  carConsumption: 0,
  fuel: "petrol",
  carPassengers: 0,
  busKm: 0,
  railKm: 0,
  flights: [],
  diet: "vegan",
}

describe("footprint", () => {
  it("только питание: кг в день × 365", () => {
    const r = footprint(empty, factors)
    expect(r.food).toBeCloseTo(2.89 * 365, 6)
    expect(r.total).toBeCloseTo(r.food, 6)
  })

  it("дом делится на семью", () => {
    const one = footprint({ ...empty, electricity: 150, gas: 10, heat: 6 }, factors).home
    const three = footprint({ ...empty, electricity: 150, gas: 10, heat: 6, people: 3 }, factors).home
    expect(one).toBeCloseTo(150 * 12 * 0.30925 + 10 * 12 * 2.06672 + 6 * 1163 * 0.2027, 6)
    expect(three).toBeCloseTo(one / 3, 6)
  })

  it("машина: км → литры → кг, делится на всех в машине; без расхода — ноль", () => {
    const car = footprint({ ...empty, carKm: 1000, carConsumption: 8 }, factors).car
    expect(car).toBeCloseTo(1000 * 12 * 0.08 * 2.33984, 6)
    expect(
      footprint({ ...empty, carKm: 1000, carConsumption: 8, carPassengers: 1 }, factors).car,
    ).toBeCloseTo(car / 2, 6)
    expect(footprint({ ...empty, carKm: 1000 }, factors).car).toBe(0)
  })

  it("мусор и отрицательные числа не ломают расчёт", () => {
    const r = footprint({ ...empty, electricity: -5, people: 0, busKm: Number.NaN }, factors)
    expect(r.home).toBe(0)
    expect(r.transit).toBe(0)
  })
})

describe("flights", () => {
  it("туда-обратно, коэффициент по дальности: от 3700 км — дальний", () => {
    expect(flightKg({ km: 1403, trips: 1 }, factors)).toBeCloseTo(2 * 1403 * 0.12576, 6)
    expect(flightKg({ km: 3903, trips: 2 }, factors)).toBeCloseTo(2 * 2 * 3903 * 0.11704, 6)
  })

  it("расстояния от Минска по координатам OurAirports", () => {
    const km = (id: string) =>
      Math.round(
        greatCircleKm(
          minskAirport,
          destinations.find((d) => d.id === id)!,
        ),
      )
    expect(km("IST")).toBe(1403)
    expect(km("DXB")).toBe(3903)
    expect(km("SVO")).toBe(640)
  })
})

describe("suggestions", () => {
  it("только то, что что-то даёт, по убыванию; перелёт — самый тяжёлый", () => {
    const s = suggestions(
      {
        ...empty,
        diet: "high_meat",
        carKm: 800,
        carConsumption: 8,
        flights: [
          { km: 1403, trips: 1 },
          { km: 6438, trips: 1 },
        ],
      },
      factors,
    )
    expect(s.map((x) => x.key)).toContain("oneFlightLess")
    expect(s.find((x) => x.key === "oneFlightLess")!.saving).toBeCloseTo(2 * 6438 * 0.11704, 6)
    expect(s.map((x) => x.key)).not.toContain("electricity10")
    expect([...s].sort((a, b) => b.saving - a.saving)).toEqual(s)
  })
})

describe("parseAmount", () => {
  it("запятая и точка, пустое — ноль", () => {
    expect(parseAmount("12,5")).toBe(12.5)
    expect(parseAmount("1 200")).toBe(1200)
    expect(parseAmount("")).toBe(0)
    expect(parseAmount("abc")).toBe(0)
  })
})
