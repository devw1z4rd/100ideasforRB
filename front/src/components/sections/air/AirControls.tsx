import { intlLocale, t } from "@/lib/locale"
import { townName } from "@/content/placeNames"
import {
  CalendarDays,
  ChartSpline,
  ChevronDown,
  Clock3,
  CloudSun,
  LocateFixed,
  MapPin,
  Table2,
  type LucideIcon,
} from "lucide-react"
import { useRef, useState, type KeyboardEvent } from "react"
import { useLatestAir } from "@/api/air"
import {
  Select,
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemText,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip } from "@/components/ui/tooltip"
import { air, periods } from "@/content/air"
import { aqiCategory } from "@/lib/aqi"
import { nearestPoint, type Period } from "@/lib/airStats"
import { useIndicator } from "@/lib/useIndicator"
import { useFinePointer } from "@/lib/useMediaQuery"
import { cn } from "@/lib/utils"

type Town = { id: string; name: string; lat: number; lon: number }

const chip =
  "h-9 rounded-full bg-muted text-sm font-medium transition-colors hover:bg-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

type ChipOption = {
  value: string
  label: string
  dot?: string
  aside?: string
}

function ChipSelect({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  options,
  header,
  className,
}: {
  id: string
  label: string
  icon: LucideIcon
  value: string
  onChange: (value: string) => void
  options: readonly ChipOption[]
  header?: { left: string; right?: string }
  className?: string
}) {
  const fine = useFinePointer()

  if (fine)
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          aria-label={label}
          className={cn(
            chip,
            "group inline-flex min-w-0 cursor-pointer items-center gap-2 pr-3 pl-3 text-left data-[state=open]:bg-border",
            className,
          )}
        >
          <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">
            <SelectValue />
          </span>
          <SelectIcon asChild>
            <ChevronDown
              aria-hidden="true"
              className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
            />
          </SelectIcon>
        </SelectTrigger>
        <SelectContent align="end" className="min-w-56">
          {header && (
            <div className="flex justify-between gap-4 px-2.5 pt-1.5 pb-1 text-[11px] text-muted-foreground">
              <span>{header.left}</span>
              {header.right && <span className="pr-5.5">{header.right}</span>}
            </div>
          )}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.dot && (
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: o.dot }}
                />
              )}
              <SelectItemText>{o.label}</SelectItemText>
              {o.aside && (
                <span className="ml-auto pl-4 text-[13px] text-muted-foreground tabular-nums">{o.aside}</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )

  return (
    <span className={cn("relative inline-flex min-w-0", className)}>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(chip, "w-full min-w-0 cursor-pointer appearance-none truncate pr-8 pl-9")}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </span>
  )
}

export function TownPicker({
  points,
  value,
  onChange,
  className,
}: {
  points: readonly Town[]
  value: string
  onChange: (id: string) => void
  className?: string
}) {
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState(false)
  const canLocate = typeof navigator !== "undefined" && "geolocation" in navigator
  const { data: latest } = useLatestAir()
  const options = points
    .map((p): ChipOption => {
      const aqi = latest?.get(p.id)?.us_aqi
      const category = aqiCategory(aqi)
      return {
        value: p.id,
        label: townName(p.name),
        dot: category?.color,
        aside: category ? String(Math.round(aqi!)) : undefined,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label, intlLocale))

  const locate = () => {
    // aria-disabled instead of disabled: a disabled button gets no hover, so the tooltip wouldn't open.
    if (locating) return
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
    <div className={cn("flex min-w-0 items-center gap-1.5", className)}>
      <ChipSelect
        id="air-town"
        label={air.townLabel}
        icon={MapPin}
        value={value}
        onChange={onChange}
        options={options}
        header={{ left: air.townLabel, right: air.townAqi }}
        className="flex-1 md:flex-none"
      />
      {canLocate &&
        (() => {
          const button = (
            <button
              type="button"
              onClick={locate}
              aria-disabled={locating}
              aria-label={geoError ? `${air.nearMe}: ${air.nearMeError}` : air.nearMe}
              className={cn(
                chip,
                "grid size-9 shrink-0 cursor-pointer place-items-center hover:text-foreground aria-disabled:opacity-60",
                geoError ? "text-destructive" : "text-muted-foreground",
                locating && "animate-pulse",
              )}
            >
              <LocateFixed aria-hidden="true" className="size-4" />
            </button>
          )
          return (
            <Tooltip
              text={geoError ? air.nearMeError : air.nearMe}
              content={
                geoError ? (
                  air.nearMeError
                ) : (
                  <>
                    <span className="font-medium">{air.nearMe}</span>
                    <br />
                    <span className="opacity-75">{air.nearMeHint}</span>
                  </>
                )
              }
            >
              {button}
            </Tooltip>
          )
        })()}
      {geoError && (
        <span role="status" className="sr-only">
          {air.nearMeError}
        </span>
      )}
    </div>
  )
}

export function PeriodSelect({
  value,
  onChange,
  className,
}: {
  value: Period
  onChange: (p: Period) => void
  className?: string
}) {
  return (
    <ChipSelect
      id="air-period"
      label={air.periodLabel}
      icon={CalendarDays}
      value={value}
      onChange={(v) => onChange(v as Period)}
      options={periods.map((p) => ({ value: p.key, label: p.short[0].toUpperCase() + p.short.slice(1) }))}
      className={className}
    />
  )
}

export function PeriodSwitch({
  value,
  onChange,
  options,
  stretch = false,
  className,
}: {
  value: Period
  onChange: (p: Period) => void
  options?: readonly Period[]
  stretch?: boolean
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={t("Период", "Перыяд")}
      className={cn(
        "rounded-md border border-input p-0.5",
        stretch ? "flex w-full md:inline-flex md:w-auto" : "inline-flex",
        className,
      )}
    >
      {periods
        .filter((p) => !options || options.includes(p.key))
        .map((p) => (
          <button
            key={p.key}
            type="button"
            role="radio"
            aria-checked={value === p.key}
            onClick={() => onChange(p.key)}
            className={cn(
              "h-8 cursor-pointer rounded-[5px] px-3 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring",
              stretch && "max-md:flex-1 max-md:px-1",
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

export type AirView = "town" | "table" | "forecast" | "hours" | "calendar"

const viewOptions: ReadonlyArray<{ key: AirView; label: string; Icon: typeof Table2 }> = [
  { key: "town", label: air.views.town, Icon: ChartSpline },
  { key: "table", label: air.views.table, Icon: Table2 },
  { key: "forecast", label: air.views.forecast, Icon: CloudSun },
  { key: "hours", label: air.views.hours, Icon: Clock3 },
  { key: "calendar", label: air.calendar.tab, Icon: CalendarDays },
]

export function ViewTabs({
  value,
  onChange,
  controls,
  className,
}: {
  value: AirView
  onChange: (view: AirView) => void
  controls: string
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const bar = useIndicator(ref, value)
  const keys = viewOptions.map((v) => v.key)

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = keys.indexOf(value)
    const next =
      e.key === "ArrowRight"
        ? keys[(i + 1) % keys.length]
        : e.key === "ArrowLeft"
          ? keys[(i - 1 + keys.length) % keys.length]
          : e.key === "Home"
            ? keys[0]
            : e.key === "End"
              ? keys[keys.length - 1]
              : null
    if (!next) return
    e.preventDefault()
    onChange(next)
    ref.current?.querySelector<HTMLElement>(`[data-nav-key="${next}"]`)?.focus()
  }

  return (
    <div
      ref={ref}
      role="tablist"
      aria-label={air.views.label}
      onKeyDown={onKeyDown}
      className={cn("relative flex sm:gap-3 lg:gap-5 xl:gap-7", className)}
    >
      {viewOptions.map(({ key, label, Icon }) => {
        const active = value === key
        return (
          <button
            key={key}
            data-nav-key={key}
            type="button"
            role="tab"
            id={`air-tab-${key}`}
            aria-selected={active}
            aria-controls={controls}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(key)}
            className={cn(
              "inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-sm text-[12px] font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:flex-none sm:text-[15px]",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon aria-hidden="true" className="hidden size-4 lg:block" />
            {label}
          </button>
        )
      })}
      {bar && (
        <span
          aria-hidden="true"
          className="absolute -bottom-px left-0 h-0.5 rounded-full bg-foreground transition-[translate,width] duration-300 ease-out motion-reduce:transition-none"
          style={{ translate: `${bar.x}px 0`, width: bar.w }}
        />
      )}
    </div>
  )
}
