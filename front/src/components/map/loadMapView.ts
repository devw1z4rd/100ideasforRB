import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url"

let loading: Promise<typeof import("./MapView")> | null = null

/**
 * Код карты: чанк MapView с MapLibre (~300 КБ gzip) и его воркер (~140 КБ). Качаются одновременно — иначе
 * воркер начинал бы грузиться только после разбора чанка, и на медленной сети карта появлялась на секунды
 * позже. Воркер попадает в HTTP-кэш, MapLibre потом берёт его оттуда.
 */
export function loadMapView() {
  if (!loading) {
    void fetch(workerUrl).catch(() => {})
    loading = import("./MapView")
    // Сеть оборвалась — следующая попытка загрузит заново
    loading.catch(() => (loading = null))
  }
  return loading
}
