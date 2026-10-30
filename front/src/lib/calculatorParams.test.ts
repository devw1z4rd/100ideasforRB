import { describe, expect, it } from "vitest"
import { CUSTOM, initialState, readState, toInputs, writeState } from "./calculatorParams"

describe("calculator params", () => {
  it("начальное состояние — пустой адрес", () => {
    expect(writeState(initialState).toString()).toBe("")
    expect(readState(new URLSearchParams())).toEqual(initialState)
  })

  it("туда и обратно без потерь, включая перелёты и своё расстояние", () => {
    const state = {
      ...initialState,
      electricity: "150",
      carConsumption: "7,5",
      fuel: "diesel" as const,
      diet: "vegan" as const,
      flights: [
        { dest: "IST", km: "", trips: "2" },
        { dest: CUSTOM, km: "1500", trips: "1" },
      ],
    }
    const params = writeState(state)
    expect(params.get("fl")).toBe("IST*2,~1500*1")
    expect(readState(new URLSearchParams(params.toString()))).toEqual(state)
  })

  it("чужие значения в адресе игнорируются", () => {
    const s = readState(new URLSearchParams("f=kerosene&d=keto&fl=,"))
    expect(s.fuel).toBe("petrol")
    expect(s.diet).toBe("medium_meat")
    expect(s.flights).toEqual([])
  })

  it("toInputs: строки → числа, расстояние из списка или своё", () => {
    const inputs = toInputs(
      {
        ...initialState,
        people: "",
        carConsumption: "7,5",
        flights: [
          { dest: "IST", km: "", trips: "2" },
          { dest: CUSTOM, km: "1500", trips: "" },
        ],
      },
      (id) => (id === "IST" ? 1403 : 0),
    )
    expect(inputs.people).toBe(1)
    expect(inputs.carConsumption).toBe(7.5)
    expect(inputs.flights).toEqual([
      { km: 1403, trips: 2 },
      { km: 1500, trips: 0 },
    ])
  })
})
