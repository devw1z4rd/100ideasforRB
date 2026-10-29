import { queryOptions, useQuery } from "@tanstack/react-query"
import { pb } from "./pb"

// Данные главной (CLAUDE.md §10.4–10.7): проблемные территории и ООПТ, предприятия.
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

export const usePlaces = () => useQuery(placesQuery())
export const useEnterprises = () => useQuery(enterprisesQuery())
