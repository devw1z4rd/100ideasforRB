import { water } from "@/content/water"
import type { PostSummary } from "@/lib/rivers"

const text = water.levels

/** Где уровень относительно порогов поста, словами: для карточки в разделе «Вода» и всплывашки на карте */
export function levelPosition({ post, latest, status }: PostSummary): string {
  if (status === "flood" || status === "danger")
    return text.aboveFlood(latest.level - post.flood_level, post.flood_level)
  if (post.low_level) {
    const diff = latest.level - post.low_level
    return diff < 0 ? text.belowLow(-diff, post.low_level) : text.aboveLow(diff, post.low_level)
  }
  return post.flood_level ? text.toFlood(post.flood_level - latest.level) : text.noThresholds
}
