import { useInView } from "motion/react"
import { useMemo, useRef, useState } from "react"
import { useEmissionStats } from "@/api/emissions"
import { HomeSectionShell } from "@/components/sections/HomeSectionShell"
import { Skeleton } from "@/components/ui/skeleton"
import { enterprises as text, HOME_REGION } from "@/content/enterprises"
import type { HomeSection } from "@/content/home"
import { change, emissionYears, regionSeries, regionsForYear } from "@/lib/emissions"
import { Composition } from "./Composition"
import { MainSources } from "./MainSources"
import { RegionCard } from "./RegionCard"
import { RegionsTable } from "./RegionsTable"
import { YearTimeline } from "./YearTimeline"

type Props = Pick<HomeSection, "id" | "eyebrow" | "title" | "variant">

/**
 * «Предприятия и вклад в загрязнение» (CLAUDE.md §10.7) на данных Белстата по областям. Сверху — Гомельская
 * область: сколько ушло в воздух и откуда эта цифра (путь веществ: образовалось → очистные / воздух). Ниже —
 * контекст страны: регионы по выбросам и что выбрасывают предприятия. Под сеткой — основные источники
 * области строкой (перечень не меняется по годам). Фон — по теме сайта. Год выбирается на таймлайне.
 */
export function EnterprisesSection(section: Props) {
  const stats = useEmissionStats()
  const rows = stats.data
  const years = useMemo(() => (rows ? emissionYears(rows) : []), [rows])
  const [picked, setPicked] = useState<number | null>(null)
  const last = years[years.length - 1]
  const year = picked ?? last

  // Бары растут от нуля, когда секция появилась на экране (§10.11)
  const box = useRef<HTMLDivElement>(null)
  const grown = useInView(box, { once: true, margin: "0px 0px -15% 0px" })
  // Второй ряд (регионы, вещества) — свой момент: бары растут, когда до него докрутили, а не вместе с верхом
  const row2 = useRef<HTMLDivElement>(null)
  const grown2 = useInView(row2, { once: true, amount: 0.25 })

  const data = useMemo(() => (rows && year ? regionsForYear(rows, year) : null), [rows, year])
  const series = useMemo(() => (rows ? regionSeries(rows, HOME_REGION) : []), [rows])
  const home = data?.regions.find((r) => r.territory === HOME_REGION)
  const prev = series.find((s) => s.year === year - 1)
  const delta = change(home?.emitted, prev?.emitted)

  return (
    <HomeSectionShell {...section}>
      {stats.isError ? (
        <p className="text-sm text-muted-foreground">{text.error}</p>
      ) : stats.isPending ? (
        <Skeleton className="h-[1400px] w-full rounded-2xl md:h-[880px]" />
      ) : !data || !home ? (
        <p className="text-sm text-muted-foreground">{text.empty}</p>
      ) : (
        // На мобиле таймлайн — в конце блока и прилипает к низу экрана; с md — сверху, под шапкой сайта
        <div ref={box} className="flex flex-col gap-4">
          {/* С md таймлайн прилипает только в пределах первого блока (карточки области): обёртка — граница
              прилипания, и когда подъезжает второй ряд, таймлайн уезжает вместе со страницей — над регионами
              и веществами он лишь закрывал бы их. На мобиле обёртки нет (contents): таймлайн, как раньше,
              в конце секции и прилипает к низу экрана, пока видна секция */}
          <div className="flex flex-col gap-4 max-md:contents">
            {/* Фон-подложка с md закрывает карточку, проезжающую под прилипшим таймлайном */}
            <div className="sticky z-20 max-md:bottom-0 max-md:order-last max-md:-mx-4 md:top-(--header-h) md:-mt-2 md:bg-background md:py-2">
              <YearTimeline series={series} year={year} grown={grown} onPick={setPicked} />
            </div>

            <RegionCard year={year} home={home} total={data.regions.length} delta={delta} grown={grown} />
          </div>

          <div ref={row2} className="grid gap-4 lg:grid-cols-2">
            <RegionsTable
              year={year}
              regions={data.regions}
              countryEmitted={data.country.emitted}
              grown={grown2}
            />
            <Composition rows={rows!} year={year} countryEmitted={data.country.emitted} grown={grown2} />
          </div>

          <MainSources className="mt-4 border-t border-border pt-6" />
        </div>
      )}
    </HomeSectionShell>
  )
}
