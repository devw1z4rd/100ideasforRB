import type {
  PlacesKindOptions,
  PlacesSeverityOptions,
  ReportsCategoryOptions,
  ReportsStatusOptions,
} from "@/api/pocketbase-types"

// Объекты карты в виде, удобном для отрисовки: координаты уже разобраны, подписи посчитаны в MapSection

export type MapTown = {
  id: string
  name: string
  lat: number
  lon: number
  district: string
  /** Текущий AQI; null — свежих данных нет */
  aqi: number | null
}

export type MapReport = {
  id: string
  lat: number
  lon: number
  category: ReportsCategoryOptions
  status: ReportsStatusOptions
  /** Дата создания, уже отформатированная */
  created: string
}

export type MapPlace = {
  id: string
  name: string
  lat: number
  lon: number
  kind: PlacesKindOptions
  severity?: PlacesSeverityOptions
  note?: string
}
