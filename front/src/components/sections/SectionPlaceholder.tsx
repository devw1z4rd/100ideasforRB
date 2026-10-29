import type { CSSProperties } from "react"
import { HomeSectionShell } from "@/components/sections/HomeSectionShell"
import { Skeleton } from "@/components/ui/skeleton"
import type { HomeSection } from "@/content/home"

type Props = Pick<HomeSection, "id" | "eyebrow" | "title" | "variant" | "minHeight">

/** Секция-якорь главной до своего подпроекта: скелетон зарезервированной высоты в общей оболочке. */
export function SectionPlaceholder({ minHeight, ...section }: Props) {
  return (
    <HomeSectionShell {...section}>
      <Skeleton
        className="h-[calc(var(--placeholder-h)/2)] w-full rounded-xl motion-reduce:animate-none md:h-(--placeholder-h)"
        style={{ "--placeholder-h": `${minHeight}px` } as CSSProperties}
      />
      <p className="mt-3 text-[13px] text-muted-foreground">Раздел в разработке</p>
    </HomeSectionShell>
  )
}
