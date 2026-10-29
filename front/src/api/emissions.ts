import { queryOptions, useQuery } from "@tanstack/react-query"
import { pb } from "./pb"
import type { EmissionStatsResponse } from "./pocketbase-types"

// Выбросы по данным Белстата (CLAUDE.md §8, §9): отходящие и уловленные по областям, выбросы по веществам по стране,
// мобильные источники. Меняются только через seed — кэш не протухает за время визита.

export type EmissionStat = Pick<
  EmissionStatsResponse,
  "territory" | "year" | "indicator" | "pollutant" | "value"
>

export const emissionStatsQuery = () =>
  queryOptions({
    queryKey: ["emissions"],
    queryFn: () =>
      pb.collection("emission_stats").getFullList<EmissionStat>({
        fields: "territory,year,indicator,pollutant,value",
        sort: "year",
      }),
    staleTime: Infinity,
  })

export const useEmissionStats = () => useQuery(emissionStatsQuery())
