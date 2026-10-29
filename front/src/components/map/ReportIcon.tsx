import { CircleAlert, Droplets, Factory, Flame, Trash2, TreePine, type LucideProps } from "lucide-react"
import type { ReportsCategoryOptions } from "@/api/pocketbase-types"

const icons = {
  dump: Trash2,
  discharge: Droplets,
  smoke: Factory,
  felling: TreePine,
  burning: Flame,
  other: CircleAlert,
} satisfies Record<ReportsCategoryOptions, unknown>

/** Значок категории обращения */
export function ReportIcon({ category, ...props }: { category: ReportsCategoryOptions } & LucideProps) {
  const Icon = icons[category]
  return <Icon aria-hidden="true" {...props} />
}
