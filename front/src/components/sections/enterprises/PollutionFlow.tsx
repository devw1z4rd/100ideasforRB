import * as m from "motion/react-m"
import { enterprises as text } from "@/content/enterprises"
import type { RegionYear } from "@/lib/emissions"
import { cn } from "@/lib/utils"
import { kt, pct } from "./format"

const t = text.flow

// viewBox units: height in px (fixed), width stretched with preserveAspectRatio="none" — the bands stay
// straight.
const W = 1000
const T = 112
const GAP = 44
const H = T + GAP
const NODE = 8
const MIN = 3

const band = (y0: number, y1: number, z0: number, z1: number) => {
  const a = NODE
  const b = W - NODE
  const mid = (a + b) / 2
  return `M ${a} ${y0} C ${mid} ${y0} ${mid} ${z0} ${b} ${z0} L ${b} ${z1} C ${mid} ${z1} ${mid} ${y1} ${a} ${y1} Z`
}

export function PollutionFlow({
  home,
  grown,
  className,
}: {
  home: RegionYear
  grown: boolean
  className?: string
}) {
  const emittedShare = home.generated ? (home.emitted / home.generated) * 100 : 0
  const capturedShare = 100 - emittedShare
  const he = Math.max((T * emittedShare) / 100, MIN)
  const top = GAP / 2

  const emittedPath = band(top, top + he, 0, he)
  const capturedPath = band(top + he, top + T, he + GAP, T + GAP)
  const capturedMid = he + GAP + (T - he) / 2

  return (
    <figure
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_9.5rem] gap-x-4 gap-y-3 sm:grid-cols-[auto_minmax(0,1fr)_minmax(176px,auto)]",
        className,
      )}
      aria-label={t.aria(
        kt(home.generated),
        kt(home.captured),
        pct(capturedShare),
        kt(home.emitted),
        pct(emittedShare),
      )}
    >
      <div className="col-span-2 flex flex-col justify-center sm:col-span-1 sm:min-h-[156px]">
        <span className="text-[13px] leading-[18px] text-muted-foreground">{t.generated}</span>
        <span className="mt-0.5 font-heading text-[28px] leading-8 font-semibold tracking-[-0.02em]">
          {kt(home.generated)}{" "}
          <span className="text-base font-medium text-muted-foreground">{text.unit}</span>
        </span>
        <span className="text-[13px] leading-[18px] text-muted-foreground">{t.whole}</span>
      </div>

      <svg
        aria-hidden="true"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full overflow-visible transition-[clip-path] duration-1000 ease-out"
        style={{ height: H, clipPath: grown ? "inset(0 0 0 0)" : "inset(0 100% 0 0)" }}
      >
        <rect x={0} y={top} width={NODE} height={T} rx={2} fill="var(--bar)" />
        <m.path
          initial={false}
          animate={{ d: capturedPath }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          fill="var(--success)"
          fillOpacity={0.35}
        />
        <m.path
          initial={false}
          animate={{ d: emittedPath }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          fill="var(--destructive)"
          fillOpacity={0.45}
        />
        <m.rect
          initial={false}
          animate={{ y: he + GAP, height: T - he }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          x={W - NODE}
          width={NODE}
          rx={2}
          fill="var(--success)"
        />
        <m.rect
          initial={false}
          animate={{ height: he }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          x={W - NODE}
          y={0}
          width={NODE}
          rx={2}
          fill="var(--destructive)"
        />
      </svg>

      <div className="flex flex-col justify-between sm:relative sm:block" style={{ height: H }}>
        <Part
          label={t.emitted}
          value={kt(home.emitted)}
          share={pct(emittedShare, 1)}
          swatch="bg-destructive"
          className="top-0"
        />
        <Part
          label={t.captured}
          short={t.capturedShort}
          value={kt(home.captured)}
          share={pct(capturedShare, 1)}
          swatch="bg-success"
          className="sm:-translate-y-1/2"
          style={{ top: capturedMid }}
        />
      </div>
    </figure>
  )
}

function Part({
  label,
  short,
  value,
  share,
  swatch,
  className,
  style,
}: {
  label: string
  short?: string
  value: string
  share: string
  swatch: string
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={cn("flex gap-2 transition-[top] duration-500 ease-out sm:absolute sm:inset-x-0", className)}
      style={style}
    >
      <span aria-hidden className={cn("mt-[5px] size-2.5 flex-none rounded-[3px]", swatch)} />
      <span className="flex min-w-0 flex-col">
        <span className="text-[13px] leading-[18px] text-muted-foreground">
          {short ? (
            <>
              <span className="sm:hidden">{short}</span>
              <span className="max-sm:hidden">{label}</span>
            </>
          ) : (
            label
          )}
        </span>
        <span className="text-base leading-6 font-semibold tabular-nums">
          <span className="whitespace-nowrap">
            {value} <span className="font-medium text-muted-foreground">{text.unit}</span>
          </span>
          <span className="block font-medium whitespace-nowrap text-muted-foreground sm:inline">
            <span className="max-sm:hidden"> · </span>
            {share}
          </span>
        </span>
      </span>
    </div>
  )
}
