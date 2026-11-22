import type { OblastFeature } from "@/api/geo"

export type LngLat = [number, number]
type Bounds = [LngLat, LngLat]
type Location = { bounds: Bounds } | { center?: LngLat; zoom: number; duration?: number }
type MapEntity = object

type YandexMap = {
  addChild(child: MapEntity): YandexMap
  removeChild(child: MapEntity): YandexMap
  destroy(): void
  setLocation(location: Location): void
  readonly zoom: number
}

type YandexMaps = {
  ready: Promise<unknown>
  YMap: new (
    container: HTMLElement,
    props: { location: Location; restrictMapArea: Bounds; margin: number[]; theme: "light" | "dark" },
  ) => YandexMap
  YMapDefaultSchemeLayer: new () => MapEntity
  YMapDefaultFeaturesLayer: new () => MapEntity
  YMapFeature: new (props: {
    geometry: OblastFeature["geometry"]
    style: { fill: string; stroke: { color: string; width: number }[] }
  }) => MapEntity
  YMapListener: new (props: {
    layer: "any"
    onClick: (object: { type: string } | undefined, event: { coordinates: LngLat }) => void
  }) => MapEntity
  YMapMarker: new (props: {
    coordinates: LngLat
    draggable: boolean
    onDragEnd: (point: LngLat) => void
  }, element: HTMLElement) => MapEntity
}

let loading: Promise<YandexMaps> | undefined

export function loadYandexMaps(key: string): Promise<YandexMaps> {
  loading ??= new Promise<YandexMaps>((resolve, reject) => {
    const script = document.createElement("script")
    const timer = window.setTimeout(() => fail(new Error("Yandex Maps timed out")), 8000)
    function fail(error: unknown) {
      window.clearTimeout(timer)
      script.remove()
      reject(error)
    }
    script.src = `https://api-maps.yandex.ru/v3/?${new URLSearchParams({ apikey: key, lang: "ru_RU" })}`
    script.referrerPolicy = "strict-origin-when-cross-origin"
    script.onerror = () => fail(new Error("Yandex Maps failed to load"))
    script.onload = async () => {
      const api = (window as Window & { ymaps3?: YandexMaps }).ymaps3
      if (!api) return fail(new Error("Yandex Maps API is unavailable"))
      try {
        await api.ready
        window.clearTimeout(timer)
        resolve(api)
      } catch (error) {
        fail(error)
      }
    }
    document.head.append(script)
  })
  return loading
}
