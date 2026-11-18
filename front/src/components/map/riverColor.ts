import type { RiverStatus } from "@/lib/rivers"

export const riverColor: Record<RiverStatus, string> = {
  low: "var(--river-low)",
  normal: "var(--river-normal)",
  flood: "var(--river-flood)",
  danger: "var(--river-danger)",
}
