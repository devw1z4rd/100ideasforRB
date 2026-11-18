import { queryOptions, useQuery } from "@tanstack/react-query"
import { pb } from "./pb"

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
