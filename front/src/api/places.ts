import { queryOptions, useQuery } from "@tanstack/react-query"
import { pb } from "./pb"

// Данные главной (CLAUDE.md §10.4–10.8): проблемные территории и ООПТ, предприятия, реки.
// Вносятся вручную через админку вместе с источником; без источника в UI не показываются (§3).

export const placesQuery = () =>
  queryOptions({
    queryKey: ["places"],
    queryFn: () => pb.collection("places").getFullList({ sort: "name" }),
  })

export const enterprisesQuery = () =>
  queryOptions({
    queryKey: ["enterprises"],
    queryFn: () => pb.collection("enterprises").getFullList({ sort: "-emission_share" }),
  })

export const waterReadingsQuery = () =>
  queryOptions({
    queryKey: ["water"],
    queryFn: () => pb.collection("water_readings").getFullList({ sort: "river,indicator,-period" }),
  })

export const usePlaces = () => useQuery(placesQuery())
export const useEnterprises = () => useQuery(enterprisesQuery())
export const useWaterReadings = () => useQuery(waterReadingsQuery())
