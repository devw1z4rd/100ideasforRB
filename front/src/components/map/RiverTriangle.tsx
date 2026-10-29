import type { RiverStatus, RiverTrend } from "@/lib/rivers"
import { cn } from "@/lib/utils"
import { riverColor } from "./riverColor"

// Знак поста как на карте уровенного режима Белгидромета: направление — уровень растёт / без изменений / падает,
// цвет — положение относительно порогов поста

const points: Record<RiverTrend, string> = {
  up: "6,1 11.5,11 0.5,11",
  down: "0.5,1 11.5,1 6,11",
  flat: "1,0.5 11.5,6 1,11.5",
}

export function RiverTriangle({
  trend,
  status,
  className,
}: {
  trend: RiverTrend
  status: RiverStatus
  className?: string
}) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className={cn("size-3 shrink-0", className)}>
      <polygon
        points={points[trend]}
        fill={riverColor[status]}
        stroke="var(--background)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  )
}
