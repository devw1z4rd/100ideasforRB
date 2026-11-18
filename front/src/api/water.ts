import { queryOptions, useQuery } from "@tanstack/react-query"
import { takeHome } from "./home"
import { pb } from "./pb"
import type { WaterReadingsResponse } from "./pocketbase-types"

// Состояние рек по квартальным обзорам Белгидромета (CLAUDE.md §8, §9): отклонения от нормативов качества воды,
// температурный режим и гидрология в пунктах наблюдений Гомельской области. Меняется раз в квартал через seed.

export type WaterReading = Pick<
  WaterReadingsResponse,
  | "river"
  | "post"
  | "section"
  | "location"
  | "indicator"
  | "value"
  | "unit"
  | "norm"
  | "norm_type"
  | "period"
  | "quarter"
  | "note"
>

/** Запись с адресом обзора, из которого она выписана (sources.url) — у каждого квартала свой */
export type WaterReadingWithSource = WaterReading & { sourceUrl?: string }

export const waterReadingsQuery = () =>
  queryOptions({
    queryKey: ["water"],
    queryFn: async (): Promise<WaterReadingWithSource[]> => {
      const home = await takeHome("water")
      if (home) return home
      const rows = await pb
        .collection("water_readings")
        .getFullList<WaterReading & { expand?: { source?: { url?: string } } }>({
          fields:
            "river,post,section,location,indicator,value,unit,norm,norm_type,period,quarter,note,expand.source.url",
          expand: "source",
          sort: "-quarter,river,post",
        })
      return rows.map(({ expand, ...r }) => ({ ...r, sourceUrl: expand?.source?.url }))
    },
    staleTime: Infinity,
  })

export const useWaterReadings = () => useQuery(waterReadingsQuery())
