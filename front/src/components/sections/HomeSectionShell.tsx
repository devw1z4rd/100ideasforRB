import { useReducedMotion } from "motion/react"
import * as m from "motion/react-m"
import type { ReactNode } from "react"
import { Container } from "@/components/layout/Container"
import { sectionHeadingId, type HomeSection } from "@/content/home"
import { cn } from "@/lib/utils"

type Props = Pick<HomeSection, "id" | "eyebrow" | "title" | "variant"> & { children: ReactNode }

// Анимируется внутренний m.div, а не сам якорь: transform на <section> смещает позицию при scrollIntoView.
// Появление при скролле один раз (§10.11); при prefers-reduced-motion анимации нет вовсе
// (MotionConfig гасит только transform, но не opacity — поэтому initial отключаем сами)
const reveal = {
  initial: { opacity: 0, y: 8 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "0px 0px -10% 0px" },
  transition: { duration: 0.4, ease: "easeOut" },
} as const

/**
 * Общая оболочка секции главной: якорь под шапкой, eyebrow + H2, тон (plain / card / bleed) и появление при скролле.
 * Содержимое секции — children.
 */
export function HomeSectionShell({ id, eyebrow, title, variant, children }: Props) {
  const titleId = sectionHeadingId(id)
  const reduceMotion = useReducedMotion()
  const content = (
    <>
      <p className="text-[13px] font-medium text-muted-foreground">{eyebrow}</p>
      <h2
        id={titleId}
        tabIndex={-1}
        className="mt-1 font-heading text-[clamp(28px,3.2vw,40px)] leading-[1.1] font-semibold tracking-[-0.03em] outline-none"
      >
        {title}
      </h2>
      <div className="mt-6">{children}</div>
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
      <m.div {...reveal} initial={reduceMotion ? false : reveal.initial}>
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
