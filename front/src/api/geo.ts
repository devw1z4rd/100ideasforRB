import { queryOptions, useQuery } from "@tanstack/react-query"

// Статичные слои карты из front/public/geo (собирает back/seed/tools/build-map-geo.mjs). Меняются только с деплоем.

export type LineFeature = {
  type: "Feature"
  properties: { name: string; major: boolean }
  geometry: { type: "MultiLineString"; coordinates: number[][][] }
}
export type GeoCollection<F> = { type: "FeatureCollection"; features: F[] }
export type OblastFeature = {
  type: "Feature"
  properties: { name: string }
  geometry:
    { type: "Polygon"; coordinates: number[][][] } | { type: "MultiPolygon"; coordinates: number[][][][] }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`${path}: ${res.status}`)
  return (await res.json()) as T
}

export const oblastQuery = () =>
  queryOptions({
    queryKey: ["geo", "oblast"],
    queryFn: () => getJson<GeoCollection<OblastFeature>>("/geo/oblast.geojson"),
    staleTime: Infinity,
  })

export const riversQuery = () =>
  queryOptions({
    queryKey: ["geo", "rivers"],
    queryFn: () => getJson<GeoCollection<LineFeature>>("/geo/rivers.geojson"),
    staleTime: Infinity,
  })

export const useOblast = () => useQuery(oblastQuery())
export const useRivers = () => useQuery(riversQuery())
