// PROTOTYPE — выбросить после выбора варианта. МОК-ДАННЫЕ: не измерения и не модель, просто правдоподобные числа,
// чтобы оценить вид. Детерминированы (seed), чтобы при перезагрузке картинка не менялась.

export const WHO_PM25 = 15

export type MockDay = { day: string; pm25: number }
export type MockTown = {
  id: string
  name: string
  /** В каком падеже писать «в …» */
  inName: string
  daily: MockDay[]
  /** Типичный AQI по часам суток 0…23 */
  hourlyAqi: number[]
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DAY_MS = 86_400_000
const today = new Date(Date.UTC(2026, 10, 12))
const days = Array.from({ length: 30 }, (_, i) =>
  new Date(today.getTime() - (30 - i) * DAY_MS).toISOString().slice(0, 10),
)

// «Эпизоды» — общие для всех городов дни плохого воздуха (безветрие, отопление), как в настоящих данных
const episodes = new Set([4, 5, 12, 13, 14, 20, 26, 27])

const towns: Array<[id: string, name: string, inName: string, base: number, seed: number]> = [
  ["gomel", "Гомель", "в Гомеле", 13, 1],
  ["mozyr", "Мозырь", "в Мозыре", 12.5, 2],
  ["zhlobin", "Жлобин", "в Жлобине", 11, 3],
  ["svetlogorsk", "Светлогорск", "в Светлогорске", 11, 4],
  ["rechitsa", "Речица", "в Речице", 9.5, 5],
  ["khoiniki", "Хойники", "в Хойниках", 7, 6],
  ["vetka", "Ветка", "в Ветке", 6.5, 7],
]

export const mockTowns: MockTown[] = towns.map(([id, name, inName, base, seed]) => {
  const rnd = mulberry32(seed * 7919)
  const daily = days.map((day, i) => {
    const bump = episodes.has(i) ? 1.6 + rnd() * 0.6 : 0.55 + rnd() * 0.7
    return { day, pm25: Math.round(base * bump * 10) / 10 }
  })
  // Утро (7–9) и вечер (18–22): печки, машины; днём ветер разгоняет — воздух чище
  const hourlyAqi = Array.from({ length: 24 }, (_, h) => {
    const morning = Math.exp(-((h - 8) ** 2) / 3)
    const evening = Math.exp(-((h - 20) ** 2) / 5)
    const night = h < 6 ? 0.35 : 0
    return Math.round(base * 2.2 + base * 3.4 * (morning * 0.8 + evening + night) + rnd() * 4)
  })
  return { id, name, inName, daily, hourlyAqi }
})

const dayFormat = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" })
export const formatDay = (day: string) => dayFormat.format(new Date(`${day}T00:00:00Z`))

export type Verdict = { level: "ok" | "elevated" | "high"; title: string; text: string }

/** Вывод простыми словами по суточному PM2.5 и норме ВОЗ */
export function verdict(pm25: number): Verdict {
  const ratio = pm25 / WHO_PM25
  if (ratio <= 1)
    return {
      level: "ok",
      title: "Чистый воздух",
      text: "Пыли меньше, чем можно по норме. Гуляй сколько хочешь!",
    }
  if (ratio <= 2)
    return {
      level: "elevated",
      title: "Пыльновато",
      text: "Пыли больше, чем можно по норме. Бегать лучше в парке, подальше от дорог.",
    }
  return {
    level: "high",
    title: "Очень пыльно",
    text: `Пыли в ${Math.round(ratio * 10) / 10} раза больше нормы. Сегодня лучше играть дома.`,
  }
}
