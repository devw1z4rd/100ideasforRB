import { useWaterReadings } from "@/api/water"
import { HomeSectionShell } from "@/components/sections/HomeSectionShell"
import { Skeleton } from "@/components/ui/skeleton"
import type { HomeSection } from "@/content/home"
import { water as text } from "@/content/water"
import { latestQuarter } from "@/lib/water"
import { RiverLevels } from "./RiverLevels"
import { WaterShelf } from "./report/WaterShelf"

type Props = Pick<HomeSection, "id" | "eyebrow" | "title" | "variant">

/**
 * «Состояние поверхностных вод» (CLAUDE.md §10.8): уровни воды на постах Белгидромета сегодня, затем последний
 * квартальный обзор качества — книжкой (report/WaterReport): закрыта — обложка и «что внутри», открыта — главы.
 */
export function WaterSection(section: Props) {
  const readings = useWaterReadings()
  const rows = readings.data
  const quarter = rows ? latestQuarter(rows) : null

  return (
    <HomeSectionShell {...section}>
      <p className="max-w-[62ch] text-base leading-[1.55] text-fg-secondary">{text.lead}</p>

      <div className="mt-10">
        <RiverLevels />
      </div>

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
