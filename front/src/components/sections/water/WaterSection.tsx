import { useWaterReadings } from "@/api/water"
import { HomeSectionShell } from "@/components/sections/HomeSectionShell"
import { Skeleton } from "@/components/ui/skeleton"
import type { HomeSection } from "@/content/home"
import { water as text } from "@/content/water"
import { latestQuarter } from "@/lib/water"
import { RiverLevels } from "./RiverLevels"
import { WaterShelf } from "./report/WaterShelf"

type Props = Pick<HomeSection, "id" | "eyebrow" | "title" | "variant">

export function WaterSection(section: Props) {
  const readings = useWaterReadings()
  const rows = readings.data
  const quarter = rows ? latestQuarter(rows) : null

  return (
    <HomeSectionShell {...section}>
      <RiverLevels />

      <div className="mt-16 border-t border-border pt-10 md:pt-14">
        {readings.isError ? (
          <p className="text-sm text-muted-foreground">{text.error}</p>
        ) : readings.isPending ? (
          <Skeleton className="h-[680px] w-full rounded-xl" />
        ) : !rows || !quarter ? (
          <p className="text-sm text-muted-foreground">{text.empty}</p>
        ) : (
          <WaterShelf rows={rows} />
        )}
      </div>
    </HomeSectionShell>
  )
}
