import { queryOptions, useQuery } from "@tanstack/react-query"
import { pb } from "./pb"
import type { DistrictsResponse } from "./pocketbase-types"

// Справочники (CLAUDE.md §8): районы, источники, точки опроса воздуха. Меняются только через seed и админку.
const REFERENCE_STALE = 60 * 60_000

/** Полигон района из OSM (back/seed/districts.geojson); у Гомельского района внутренние кольца — г. Гомель. */
export type DistrictGeometry =
  { type: "Polygon"; coordinates: number[][][] } | { type: "MultiPolygon"; coordinates: number[][][][] }

export type DistrictWithGeometry = DistrictsResponse<DistrictGeometry>

// Без geometry: полигоны весят ~150 КБ и нужны только карте
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
    queryFn: () =>
      pb
        .collection("districts")
        .getFullList<DistrictWithGeometry>({ sort: "name", fields: "id,name,geometry" }),
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
    queryFn: () => pb.collection("air_points").getFullList({ filter: "active = true", sort: "name" }),
    staleTime: REFERENCE_STALE,
  })

export const useDistricts = () => useQuery(districtsQuery())
export const useDistrictGeometry = () => useQuery(districtGeometryQuery())
export const useSources = () => useQuery(sourcesQuery())
export const useAirPoints = () => useQuery(airPointsQuery())
