import { queryOptions, useQuery } from "@tanstack/react-query"
import { parsePbDate } from "./dates"
import { pb } from "./pb"
import type { AirDailyResponse, AirReadingsResponse } from "./pocketbase-types"

// Качество воздуха (CLAUDE.md §4 M2, §8): почасовые air_readings пишет cron раз в час, air_daily — раз в сутки.
// Значения модельные (CAMS / Open-Meteo) — подпись в UI обязательна (§9).

const READING_FIELDS = "point,ts,pm2_5,pm10,no2,so2,o3,co,us_aqi"
// Окно для «текущих» значений: cron ходит раз в час, 3 часа покрывают один пропущенный запуск
const LATEST_WINDOW_MS = 3 * 60 * 60_000

export type AirReading = Pick<
  AirReadingsResponse,
  "point" | "ts" | "pm2_5" | "pm10" | "no2" | "so2" | "o3" | "co" | "us_aqi"
>

/** Последнее фактическое значение по каждой точке; readings — отсортированы по ts по убыванию. */
export function latestByPoint(readings: readonly AirReading[]): Map<string, AirReading> {
  const latest = new Map<string, AirReading>()
  for (const r of readings) if (!latest.has(r.point)) latest.set(r.point, r)
  return latest
}

export const latestAirQuery = () =>
  queryOptions({
    queryKey: ["air", "latest"],
    queryFn: async () => {
      const readings = await pb.collection("air_readings").getFullList<AirReading>({
        filter: pb.filter("is_forecast = false && ts >= {:since}", {
          since: new Date(Date.now() - LATEST_WINDOW_MS),
        }),
        sort: "-ts",
        fields: READING_FIELDS,
      })
      return latestByPoint(readings)
    },
  })

/** Когда cron последний раз что-то записал — для «Обновлено N минут назад» в шапке (§10.2). null — данных нет. */
export const airUpdatedAtQuery = () =>
  queryOptions({
    queryKey: ["air", "updated"],
    queryFn: async () => {
      const page = await pb.collection("air_readings").getList(1, 1, { sort: "-updated", fields: "updated" })
      return parsePbDate(page.items[0]?.updated)
    },
  })

/** Суточные агрегаты по местным (минским) дням from…to включительно, "YYYY-MM-DD". Все точки — агрегирует вызывающий. */
export const airDailyQuery = (from: string, to: string) =>
  queryOptions({
    queryKey: ["air", "daily", from, to],
    queryFn: () =>
      pb.collection("air_daily").getFullList<AirDailyResponse>({
        filter: pb.filter("date >= {:from} && date <= {:to}", {
          from: `${from} 00:00:00.000Z`,
          to: `${to} 00:00:00.000Z`,
        }),
        sort: "date",
        batch: 1000,
      }),
  })

export const useLatestAir = () => useQuery(latestAirQuery())
export const useAirUpdatedAt = () => useQuery(airUpdatedAtQuery())
export const useAirDaily = (from: string, to: string) => useQuery(airDailyQuery(from, to))
