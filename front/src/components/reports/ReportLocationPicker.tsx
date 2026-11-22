import { useEffect, useRef, useState, type ComponentProps } from "react"
import type { GeoPoint } from "@/api/pocketbase-types"
import { useOblast } from "@/api/geo"
import { map as mapText } from "@/content/map"
import { reportForm as text } from "@/content/reports"
import { cn } from "@/lib/utils"
import { loadYandexMaps, type LngLat } from "@/lib/yandexMaps"
import { PointPicker } from "./PointPicker"

type Props = Pick<ComponentProps<typeof PointPicker>, "value" | "onChange" | "focus" | "className">
type MapsApi = Awaited<ReturnType<typeof loadYandexMaps>>
type MapInstance = { api: MapsApi; map: InstanceType<MapsApi["YMap"]>; active: boolean }
const key = import.meta.env.VITE_YANDEX_MAPS_API_KEY?.trim()

const coords = (point: GeoPoint): LngLat => [point.lon, point.lat]
const toBounds = ([west, south, east, north]: [number, number, number, number]): [LngLat, LngLat] => [
  [west, north],
  [east, south],
]

export function ReportLocationPicker(props: Props) {
  return key ? <YandexPicker {...props} apiKey={key} /> : <PointPicker {...props} appearance="light" />
}

function YandexPicker({ apiKey, value, focus, onChange, className }: Props & { apiKey: string }) {
  const container = useRef<HTMLDivElement>(null)
  const [instance, setInstance] = useState<MapInstance>()
  const [failed, setFailed] = useState(false)
  const oblast = useOblast().data

  useEffect(() => {
    let cancelled = false
    let created: MapInstance | undefined
    loadYandexMaps(apiKey)
      .then((api) => {
        if (cancelled || !container.current) return
        const map = new api.YMap(container.current, {
          location: { bounds: toBounds(mapText.bounds) },
          restrictMapArea: toBounds(mapText.maxBounds),
          margin: [16, 16, 16, 16],
          theme: "light",
        })
        created = { api, map, active: true }
        map.addChild(new api.YMapDefaultSchemeLayer()).addChild(new api.YMapDefaultFeaturesLayer())
        setInstance(created)
      })
      .catch(() => {
        if (created) {
          created.active = false
          created.map.destroy()
        }
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
      if (created?.active) {
        created.active = false
        created.map.destroy()
      }
    }
  }, [apiKey])

  useEffect(() => {
    if (instance && focus) instance.map.setLocation({ center: coords(focus), zoom: 15, duration: 900 })
  }, [instance, focus])

  useEffect(() => {
    if (!instance || !oblast) return
    const color = getComputedStyle(document.documentElement).getPropertyValue("--ring").trim()
    const outline = oblast.features.map(({ geometry }) =>
      new instance.api.YMapFeature({ geometry, style: { fill: "transparent", stroke: [{ color, width: 2 }] } }),
    )
    outline.forEach((feature) => instance.map.addChild(feature))
    return () => {
      if (instance.active) outline.forEach((feature) => instance.map.removeChild(feature))
    }
  }, [instance, oblast])

  useEffect(() => {
    if (!instance || !onChange) return
    const select = ([lon, lat]: LngLat) => onChange({ lon, lat })
    const listener = new instance.api.YMapListener({
      layer: "any",
      onClick: (object, event) => {
        if (object?.type !== "marker") select(event.coordinates)
      },
    })
    instance.map.addChild(listener)

    const pin = document.createElement("div")
    pin.className = "size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-destructive shadow"
    const marker = value && new instance.api.YMapMarker(
      { coordinates: coords(value), draggable: true, onDragEnd: select }, pin,
    )
    if (marker) instance.map.addChild(marker)
    return () => {
      if (!instance.active) return
      if (marker) instance.map.removeChild(marker)
      instance.map.removeChild(listener)
    }
  }, [instance, onChange, value])

  if (failed) {
    return <PointPicker value={value} focus={focus} onChange={onChange} className={className} appearance="light" />
  }

  return (
    <div className={cn("relative isolate", className)}>
      <div ref={container} className="size-full" role="region" aria-label={text.yandexMap} />
      {instance ? (
        <div className="absolute top-3 right-3 grid overflow-hidden rounded-lg border border-border bg-background shadow">
          <button
            type="button"
            aria-label={text.zoomIn}
            className="size-8 hover:bg-muted"
            onClick={() => instance.map.setLocation({ zoom: instance.map.zoom + 1 })}
          >
            +
          </button>
          <button
            type="button"
            aria-label={text.zoomOut}
            className="size-8 border-t border-border hover:bg-muted"
            onClick={() => instance.map.setLocation({ zoom: instance.map.zoom - 1 })}
          >
            −
          </button>
        </div>
      ) : (
        <span role="status" className="absolute inset-0 grid place-items-center text-sm">
          {text.loadingMap}
        </span>
      )}
    </div>
  )
}
