import { formatNumber } from "@/lib/format"

export const pct = (v: number, digits = 0) => `${formatNumber(v, digits)}%`

export const kt = (v: number) => formatNumber(Math.round(v))
