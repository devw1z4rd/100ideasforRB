import type { CSSProperties } from "react"
import { HomeSectionShell } from "@/components/sections/HomeSectionShell"
import { Skeleton } from "@/components/ui/skeleton"
import type { HomeSection } from "@/content/home"

type Props = Pick<HomeSection, "id" | "eyebrow" | "title" | "variant" | "minHeight">

export function SectionPlaceholder({ minHeight, ...section }: Props) {
  return (
    <HomeSectionShell {...section}>
      <Skeleton
        className="h-[calc(var(--placeholder-h)/2)] w-full rounded-xl motion-reduce:animate-none md:h-(--placeholder-h)"
        style={{ "--placeholder-h": `${minHeight}px` } as CSSProperties}
      />
    </HomeSectionShell>
  )
}
