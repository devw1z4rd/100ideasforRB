import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url"

let loading: Promise<typeof import("./MapView")> | null = null

/**
 * Fetches the MapView chunk (MapLibre) and its worker in parallel; otherwise the worker would start only
 * after the chunk is parsed.
 */
export function loadMapView() {
  if (!loading) {
    void fetch(workerUrl).catch(() => {})
    loading = import("./MapView")
    // Network error: let the next call retry.
    loading.catch(() => (loading = null))
  }
  return loading
}
