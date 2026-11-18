import type {
  PlacesKindOptions,
  PlacesSeverityOptions,
  ReportsCategoryOptions,
  ReportsStatusOptions,
} from "@/api/pocketbase-types"

export type MapTown = {
  id: string
  name: string
  lat: number
  lon: number
  district: string
  aqi: number | null
}

export type MapReport = {
  id: string
  lat: number
  lon: number
  category: ReportsCategoryOptions
  status: ReportsStatusOptions
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
