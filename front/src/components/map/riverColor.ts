import type { RiverStatus } from "@/lib/rivers"

/** Цвет поста по положению уровня относительно порогов — как у Белгидромета (токены --river-*) */
export const riverColor: Record<RiverStatus, string> = {
  low: "var(--river-low)",
  normal: "var(--river-normal)",
  flood: "var(--river-flood)",
  danger: "var(--river-danger)",
}
