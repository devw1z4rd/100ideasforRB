import { queryOptions, useQuery } from "@tanstack/react-query"
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

export const waterReadingsQuery = () =>
  queryOptions({
    queryKey: ["water"],
    queryFn: () =>
      pb.collection("water_readings").getFullList<WaterReading>({
        fields: "river,post,section,location,indicator,value,unit,norm,norm_type,period,quarter,note",
        sort: "-quarter,river,post",
      }),
    staleTime: Infinity,
  })

export const useWaterReadings = () => useQuery(waterReadingsQuery())
