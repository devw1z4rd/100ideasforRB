import { queryOptions, useQuery } from "@tanstack/react-query"
import type { PolygonGeometry } from "@/lib/geo"
import { takeHome } from "./home"
import { pb } from "./pb"
import type { DistrictsResponse } from "./pocketbase-types"

const REFERENCE_STALE = 60 * 60_000

export type DistrictGeometry = PolygonGeometry

export type DistrictWithGeometry = DistrictsResponse<DistrictGeometry>

// No geometry here: polygons weigh ~150 KB and only the map needs them.
const DISTRICT_FIELDS = "id,name,name_be,center,area_km2,population,forest_cover"

export const districtsQuery = () =>
  queryOptions({
    queryKey: ["districts"],
    queryFn: () => pb.collection("districts").getFullList({ sort: "name", fields: DISTRICT_FIELDS }),
    staleTime: REFERENCE_STALE,
  })

export const districtGeometryQuery = () =>
  queryOptions({
    queryKey: ["districts", "geometry"],
    queryFn: async () =>
      (await takeHome("districts")) ??
      (await pb
        .collection("districts")
        .getFullList<DistrictWithGeometry>({ sort: "name", fields: "id,name,geometry" })),
    staleTime: Infinity,
  })

export const sourcesQuery = () =>
  queryOptions({
    queryKey: ["sources"],
    queryFn: () => pb.collection("sources").getFullList({ sort: "title" }),
    staleTime: REFERENCE_STALE,
  })

export const airPointsQuery = () =>
  queryOptions({
    queryKey: ["air", "points"],
    queryFn: async () =>
      (await takeHome("points")) ??
      (await pb.collection("air_points").getFullList({ filter: "active = true", sort: "name" })),
    staleTime: REFERENCE_STALE,
  })

export const useDistricts = () => useQuery(districtsQuery())
export const useDistrictGeometry = () => useQuery(districtGeometryQuery())
export const useSources = () => useQuery(sourcesQuery())
export const useAirPoints = () => useQuery(airPointsQuery())
