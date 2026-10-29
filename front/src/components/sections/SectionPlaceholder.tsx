import * as m from "motion/react-m"
import type { CSSProperties } from "react"
import { Container } from "@/components/layout/Container"
import { Skeleton } from "@/components/ui/skeleton"
import type { HomeSection } from "@/content/home"
import { cn } from "@/lib/utils"

type Props = Pick<HomeSection, "id" | "eyebrow" | "title" | "variant" | "minHeight">

// Анимируется внутренний m.div, а не сам якорь: transform на <section> смещает позицию при scrollIntoView.
// Появление при скролле один раз (§10.11); при prefers-reduced-motion его гасит MotionConfig в RootLayout
const reveal = {
  initial: { opacity: 0, y: 8 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "0px 0px -10% 0px" },
  transition: { duration: 0.4, ease: "easeOut" },
} as const

/** Секция-якорь главной до своего подпроекта: заголовок + скелетон зарезервированной высоты. */
export function SectionPlaceholder({ id, eyebrow, title, variant, minHeight }: Props) {
  const titleId = `${id}-title`
  const content = (
    <>
      <p className="text-[13px] font-medium text-muted-foreground">{eyebrow}</p>
      <h2
        id={titleId}
        className="mt-1 font-heading text-[clamp(28px,3.2vw,40px)] leading-[1.1] font-semibold tracking-[-0.03em]"
      >
        {title}
      </h2>
      <Skeleton
        className="mt-6 h-[calc(var(--placeholder-h)/2)] w-full rounded-xl motion-reduce:animate-none md:h-(--placeholder-h)"
        style={{ "--placeholder-h": `${minHeight}px` } as CSSProperties}
      />
      <p className="mt-3 text-[13px] text-muted-foreground">Раздел в разработке</p>
    </>
  )

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn(
        "scroll-mt-(--header-h) py-12 md:py-16",
        variant === "bleed" && "dark bg-background text-foreground",
      )}
    >
      <m.div {...reveal}>
        <Container>
          {variant === "card" ? (
            <div className="dark rounded-2xl bg-background p-6 text-foreground md:p-8">{content}</div>
          ) : (
            content
          )}
        </Container>
      </m.div>
    </section>
  )
}
