import type { RiverPost } from "@/lib/rivers"
import type { AirReading } from "./air"
import type { AirDailyResponse, AirPointsResponse, RiverLevelsResponse } from "./pocketbase-types"
import type { DistrictWithGeometry } from "./reference"
import type { WaterReadingWithSource } from "./water"

/**
 * Данные первого экрана главной одним ответом — `GET /api/eco/home` (back/pb_hooks/home.pb.js). Запрос уходит
 * из index.html (`window.__ecoHome`), пока браузер ещё качает JS: к старту React данные уже есть, и карта не ждёт
 * шесть отдельных запросов. Строки те же, что отдают обычные запросы коллекций, поэтому queryFn в air.ts,
 * reference.ts, rivers.ts и water.ts сначала спрашивают здесь, а если ответа нет — идут обычным путём.
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
    /** Ответ /api/eco/home, запрошенный из index.html; null — не главная или запрос не удался */
    __ecoHome?: Promise<HomeData | null>
  }
}

// Ответ годится только для первого рендера: позже данные могли обновиться (cron воздуха — раз в час),
// и повторные запросы (refetchInterval, инвалидация) идут в коллекции
const FRESH_MS = 60_000
const started = Date.now()
const taken = new Set<keyof HomeData>()

/** Часть ответа главной — один раз на ключ и только сразу после загрузки страницы; иначе null. */
export async function takeHome<K extends keyof HomeData>(key: K): Promise<HomeData[K] | null> {
  const pending = typeof window === "undefined" ? undefined : window.__ecoHome
  if (!pending || taken.has(key)) return null
  taken.add(key)
  const data = await pending
  if (!data || Date.now() - started > FRESH_MS) return null
  return data[key] ?? null
}
