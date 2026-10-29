import { LocateFixed } from "lucide-react"
import { useState } from "react"
import { air, periods } from "@/content/air"
import { nearestPoint, type Period } from "@/lib/airStats"
import { cn } from "@/lib/utils"

type Town = { id: string; name: string; lat: number; lon: number }

const control =
  "h-9 rounded-md border border-input bg-background px-3 text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

/** Выбор города: список + «Рядом со мной» (координаты остаются в браузере, на сервер не уходят). */
export function TownPicker({
  points,
  value,
  onChange,
}: {
  points: readonly Town[]
  value: string
  onChange: (id: string) => void
}) {
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState(false)
  const canLocate = typeof navigator !== "undefined" && "geolocation" in navigator

  const locate = () => {
    setLocating(true)
    setGeoError(false)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false)
        const nearest = nearestPoint(points, coords.latitude, coords.longitude)
        if (nearest) onChange(nearest.id)
      },
      () => {
        setLocating(false)
        setGeoError(true)
      },
      { maximumAge: 10 * 60_000, timeout: 10_000 },
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="air-town">
        {air.townLabel}
      </label>
      <select
        id="air-town"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(control, "pr-8 font-medium")}
      >
        {[...points]
          .sort((a, b) => a.name.localeCompare(b.name, "ru"))
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
      </select>
      {canLocate && (
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className={cn(control, "inline-flex cursor-pointer items-center gap-1.5 disabled:opacity-60")}
          title={geoError ? air.nearMeError : undefined}
        >
          <LocateFixed aria-hidden="true" className="size-4" />
          {air.nearMe}
        </button>
      )}
      {geoError && (
        <span role="status" className="text-xs text-muted-foreground">
          {air.nearMeError}
        </span>
      )}
    </div>
  )
}

/** Сегмент периода (§10.6): активный — чёрный. */
export function PeriodSwitch({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div role="radiogroup" aria-label="Период" className="inline-flex rounded-md border border-input p-0.5">
      {periods.map((p) => (
        <button
          key={p.key}
          type="button"
          role="radio"
          aria-checked={value === p.key}
          onClick={() => onChange(p.key)}
          className={cn(
            "h-8 cursor-pointer rounded-[5px] px-3 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring",
            value === p.key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
