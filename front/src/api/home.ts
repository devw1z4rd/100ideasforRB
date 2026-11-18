import type { RiverPost } from "@/lib/rivers"
import type { AirReading } from "./air"
import type { AirDailyResponse, AirPointsResponse, RiverLevelsResponse } from "./pocketbase-types"
import type { DistrictWithGeometry } from "./reference"
import type { WaterReadingWithSource } from "./water"

/**
 * Home first-screen data from `GET /api/eco/home` (back/pb_hooks/home.pb.js), requested from index.html
 * (`window.__ecoHome`) while JS loads. Its fields must match the collection queries in air.ts, reference.ts,
 * rivers.ts and water.ts.
 */
export type HomeData = {
  points: AirPointsResponse[]
  districts: DistrictWithGeometry[]
  latest: AirReading[]
  daily: { from: string; to: string; rows: AirDailyResponse[] }
  riverPosts: RiverPost[]
  riverLevels: Pick<RiverLevelsResponse, "post" | "date" | "level" | "change" | "ice">[]
  water: WaterReadingWithSource[]
}

declare global {
  interface Window {
    __ecoHome?: Promise<HomeData | null>
  }
}

// Only valid for the first render; refetches and invalidations go to the collections.
const FRESH_MS = 60_000
const started = Date.now()
const taken = new Set<keyof HomeData>()

export async function takeHome<K extends keyof HomeData>(key: K): Promise<HomeData[K] | null> {
  const pending = typeof window === "undefined" ? undefined : window.__ecoHome
  if (!pending || taken.has(key)) return null
  taken.add(key)
  const data = await pending
  if (!data || Date.now() - started > FRESH_MS) return null
  return data[key] ?? null
}
