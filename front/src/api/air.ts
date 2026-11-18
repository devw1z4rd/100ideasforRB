import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query"
import type { DailyRow } from "@/lib/airStats"
import { minskDayStart, type HourlyRow } from "@/lib/airHourly"
import { addDays, minskToday } from "@/lib/airStats"
import { parsePbDate, pbDay } from "./dates"
import { takeHome } from "./home"
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
    // Страница может быть открыта долго (проектор на защите), а сервер после старта догружает воздух не сразу:
    // без опроса «сейчас» осталось бы тем, что было при загрузке
    refetchInterval: 5 * 60_000,
  })

/** Когда cron последний раз что-то записал — для «обновлено N минут назад» в футере. null — данных нет. */
export const airUpdatedAtQuery = () =>
  queryOptions({
    queryKey: ["air", "updated"],
    queryFn: async () => {
      const page = await pb.collection("air_readings").getList(1, 1, { sort: "-updated", fields: "updated" })
      return parsePbDate(page.items[0]?.updated)
    },
    // Cron пишет раз в час; страница может быть открыта долго
    refetchInterval: 5 * 60_000,
  })

const DAILY_FIELDS = "point,date,aqi_max,pm2_5_avg,pm10_avg,no2_avg,so2_avg"

/**
 * Суточные средние по местным (минским) дням from…to включительно, "YYYY-MM-DD", по всем точкам.
 * Только поля для секции «Воздух»: с начала года это ~6 тыс. строк.
 */
export const airDailyQuery = (from: string, to: string) =>
  queryOptions({
    queryKey: ["air", "daily", from, to],
    queryFn: async (): Promise<DailyRow[]> => {
      // Ответ главной — только если сервер посчитал то же окно (на стыке суток окна могут разойтись)
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

/**
 * Прогноз по одному городу: почасовые значения с начала сегодняшних минских суток — прошедшие часы
 * фактические, дальше прогноз CAMS на ~5 дней (cron пересчитывает его каждый час).
 */
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

/**
 * Сегодня, пока сутки не закончились: фактические часы всех городов с начала минских суток — для незавершённой
 * точки «сегодня» на графике (суточных за сегодня в air_daily ещё нет). ~21 × 24 строк.
 */
export const airTodayQuery = () =>
  queryOptions({
    queryKey: ["air", "today", minskToday()],
    queryFn: async (): Promise<TodayReading[]> =>
      pb.collection("air_readings").getFullList<TodayReading>({
        filter: pb.filter("is_forecast = false && ts >= {:since}", { since: minskDayStart(minskToday()) }),
        fields: "point,pm2_5,pm10,no2,so2",
        batch: 1000,
      }),
    // Cron добавляет час раз в час; страница может быть открыта долго
    refetchInterval: 30 * 60_000,
  })

/** Фактические почасовые значения одного города за минские сутки from…to (почасовые хранятся 90 дней) */
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
// При смене периода старые данные остаются на экране, пока грузятся новые — без мигания скелетона
export const useAirDaily = (from: string, to: string) =>
  useQuery({ ...airDailyQuery(from, to), placeholderData: keepPreviousData })
