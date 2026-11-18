import { queryOptions, useQuery } from "@tanstack/react-query"

// Статичные слои карты из front/public/geo (собирают back/seed/tools/build-map-geo.mjs и build-map-borders.mjs).
// Меняются только с деплоем.

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

/**
 * Окружение области (build-map-borders.mjs): границы стран и областей — линии, вдоль контура области без дублей;
 * контур Беларуси — полигон, им остальная страна отделяется от соседних государств
 */
export type BorderFeature =
  | {
      type: "Feature"
      // blr — линия Беларуси (граница страны или её областей): на старте карты видна только она
      properties: { kind: "country" | "region"; blr?: boolean }
      geometry: { type: "MultiLineString"; coordinates: number[][][] }
    }
  | { type: "Feature"; properties: { kind: "belarus" }; geometry: OblastFeature["geometry"] }

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

export const bordersQuery = () =>
  queryOptions({
    queryKey: ["geo", "borders"],
    queryFn: () => getJson<GeoCollection<BorderFeature>>("/geo/borders.geojson"),
    staleTime: Infinity,
  })

export const useOblast = () => useQuery(oblastQuery())
export const useRivers = () => useQuery(riversQuery())
export const useBorders = () => useQuery(bordersQuery())
