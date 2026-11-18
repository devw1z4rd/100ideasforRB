import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query"
import type { DailyRow } from "@/lib/airStats"
import { minskDayStart, type HourlyRow } from "@/lib/airHourly"
import { addDays, minskToday } from "@/lib/airStats"
import { parsePbDate, pbDay } from "./dates"
import { takeHome } from "./home"
import { pb } from "./pb"
import type { AirDailyResponse, AirReadingsResponse } from "./pocketbase-types"

const READING_FIELDS = "point,ts,pm2_5,pm10,no2,so2,o3,co,us_aqi"
// 3 hours cover one missed hourly cron run.
const LATEST_WINDOW_MS = 3 * 60 * 60_000

export type AirReading = Pick<
  AirReadingsResponse,
  "point" | "ts" | "pm2_5" | "pm10" | "no2" | "so2" | "o3" | "co" | "us_aqi"
>

export function latestByPoint(readings: readonly AirReading[]): Map<string, AirReading> {
  const latest = new Map<string, AirReading>()
  for (const r of readings) if (!latest.has(r.point)) latest.set(r.point, r)
  return latest
}

export const latestAirQuery = () =>
  queryOptions({
    queryKey: ["air", "latest"],
    queryFn: async () => {
      const readings =
        (await takeHome("latest")) ??
        (await pb.collection("air_readings").getFullList<AirReading>({
          filter: pb.filter("is_forecast = false && ts >= {:since}", {
            since: new Date(Date.now() - LATEST_WINDOW_MS),
          }),
          sort: "-ts",
          fields: READING_FIELDS,
        }))
      return latestByPoint(readings)
    },
    refetchInterval: 5 * 60_000,
  })

export const airUpdatedAtQuery = () =>
  queryOptions({
    queryKey: ["air", "updated"],
    queryFn: async () => {
      const page = await pb.collection("air_readings").getList(1, 1, { sort: "-updated", fields: "updated" })
      return parsePbDate(page.items[0]?.updated)
    },
    refetchInterval: 5 * 60_000,
  })

const DAILY_FIELDS = "point,date,aqi_max,pm2_5_avg,pm10_avg,no2_avg,so2_avg"

export const airDailyQuery = (from: string, to: string) =>
  queryOptions({
    queryKey: ["air", "daily", from, to],
    queryFn: async (): Promise<DailyRow[]> => {
      // Use the home response only if the server computed the same window (they can differ around midnight).
      const home = await takeHome("daily")
      const rows =
        home && home.from === from && home.to === to
          ? home.rows
          : await pb.collection("air_daily").getFullList<AirDailyResponse>({
              filter: pb.filter("date >= {:from} && date <= {:to}", {
                from: `${from} 00:00:00.000Z`,
                to: `${to} 00:00:00.000Z`,
              }),
              sort: "date",
              fields: DAILY_FIELDS,
              batch: 1000,
            })
      return rows.map((r) => ({
        point: r.point,
        day: pbDay(r.date),
        aqi_max: r.aqi_max ?? 0,
        pm2_5_avg: r.pm2_5_avg ?? 0,
        pm10_avg: r.pm10_avg ?? 0,
        no2_avg: r.no2_avg ?? 0,
        so2_avg: r.so2_avg ?? 0,
      }))
    },
  })

const HOURLY_FIELDS = "ts,pm2_5,pm10,no2,so2,us_aqi"
const toHourly = (r: AirReadingsResponse): HourlyRow => ({
  ts: r.ts,
  us_aqi: r.us_aqi ?? 0,
  pm2_5: r.pm2_5 ?? 0,
  pm10: r.pm10 ?? 0,
  no2: r.no2 ?? 0,
  so2: r.so2 ?? 0,
})

export const airForecastQuery = (pointId: string) =>
  queryOptions({
    queryKey: ["air", "forecast", pointId],
    queryFn: async () => {
      const rows = await pb.collection("air_readings").getFullList<AirReadingsResponse>({
        filter: pb.filter("point = {:point} && ts >= {:since}", {
          point: pointId,
          since: minskDayStart(minskToday()),
        }),
        sort: "ts",
        fields: HOURLY_FIELDS,
        batch: 500,
      })
      return rows.map(toHourly)
    },
    refetchInterval: 30 * 60_000,
  })

export type TodayReading = Pick<AirReadingsResponse, "point" | "pm2_5" | "pm10" | "no2" | "so2">

export const airTodayQuery = () =>
  queryOptions({
    queryKey: ["air", "today", minskToday()],
    queryFn: async (): Promise<TodayReading[]> =>
      pb.collection("air_readings").getFullList<TodayReading>({
        filter: pb.filter("is_forecast = false && ts >= {:since}", { since: minskDayStart(minskToday()) }),
        fields: "point,pm2_5,pm10,no2,so2",
        batch: 1000,
      }),
    refetchInterval: 30 * 60_000,
  })

export const airHourlyQuery = (pointId: string, from: string, to: string) =>
  queryOptions({
    queryKey: ["air", "hourly", pointId, from, to],
    queryFn: async () => {
      const rows = await pb.collection("air_readings").getFullList<AirReadingsResponse>({
        filter: pb.filter("point = {:point} && is_forecast = false && ts >= {:from} && ts < {:to}", {
          point: pointId,
          from: minskDayStart(from),
          to: minskDayStart(addDays(to, 1)),
        }),
        sort: "ts",
        fields: HOURLY_FIELDS,
        batch: 1000,
      })
      return rows.map(toHourly)
    },
  })

export const useLatestAir = () => useQuery(latestAirQuery())
export const useAirForecast = (pointId: string) => useQuery(airForecastQuery(pointId))
export const useAirToday = () => useQuery(airTodayQuery())
export const useAirHourly = (pointId: string, from: string, to: string) =>
  useQuery({ ...airHourlyQuery(pointId, from, to), placeholderData: keepPreviousData })
export const useAirUpdatedAt = () => useQuery(airUpdatedAtQuery())
export const useAirDaily = (from: string, to: string) =>
  useQuery({ ...airDailyQuery(from, to), placeholderData: keepPreviousData })
