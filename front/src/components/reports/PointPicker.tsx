import "maplibre-gl/dist/maplibre-gl.css"
import { setWorkerUrl } from "maplibre-gl"
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url"
import { useEffect, useMemo, useRef } from "react"
import { cn } from "@/lib/utils"
import MapGL, { Layer, Marker, NavigationControl, Source, type MapRef } from "react-map-gl/maplibre"
import type { GeoPoint } from "@/api/pocketbase-types"
import { useOblast } from "@/api/geo"
import { map as mapText } from "@/content/map"

setWorkerUrl(workerUrl)

const STYLE_LIGHT = "https://tiles.openfreemap.org/styles/positron"
const STYLE_DARK = "https://tiles.openfreemap.org/styles/dark"

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

export function PointPicker({
  value,
  onChange,
  readOnly = false,
  focus,
  className,
}: {
  value: GeoPoint | null
  onChange?: (point: GeoPoint) => void
  readOnly?: boolean
  focus?: GeoPoint | null
  className?: string
}) {
  const mapRef = useRef<MapRef>(null)
  useEffect(() => {
    if (focus) mapRef.current?.flyTo({ center: [focus.lon, focus.lat], zoom: 15, duration: 900 })
  }, [focus])
  const oblast = useOblast()
  const colors = useMemo(() => ({ outline: cssVar("--ring"), marker: cssVar("--destructive") }), [])
  const dark = document.documentElement.classList.contains("dark")

  return (
    // isolate: keeps MapLibre controls below the sticky Submit button and the header.
    <div className={cn("isolate", className)}>
      <MapGL
        ref={mapRef}
        mapStyle={dark ? STYLE_DARK : STYLE_LIGHT}
        initialViewState={
          value
            ? { longitude: value.lon, latitude: value.lat, zoom: readOnly ? 10 : 13 }
            : { bounds: mapText.bounds, fitBoundsOptions: { padding: 16 } }
        }
        maxBounds={mapText.maxBounds}
        attributionControl={{ compact: true }}
        dragRotate={false}
        touchPitch={false}
        cursor={readOnly ? "grab" : "crosshair"}
        onClick={(e) => !readOnly && onChange?.({ lon: e.lngLat.lng, lat: e.lngLat.lat })}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl showCompass={false} position="bottom-right" />
        {oblast.data && (
          <Source id="oblast" type="geojson" data={oblast.data}>
            <Layer
              id="oblast-line"
              type="line"
              paint={{ "line-color": colors.outline, "line-width": 2, "line-dasharray": [3, 1.5] }}
            />
          </Source>
        )}
        {value && (
          <Marker
            longitude={value.lon}
            latitude={value.lat}
            anchor="bottom"
            color={colors.marker}
            draggable={!readOnly}
            onDragEnd={(e) => onChange?.({ lon: e.lngLat.lng, lat: e.lngLat.lat })}
          />
        )}
      </MapGL>
    </div>
  )
}
