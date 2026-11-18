import { queryOptions, useQuery } from "@tanstack/react-query"
import { pb } from "./pb"
import type { EmissionStatsResponse } from "./pocketbase-types"

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
