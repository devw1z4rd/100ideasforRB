import { useReducedMotion } from "motion/react"
import * as m from "motion/react-m"
import type { ReactNode } from "react"
import { Container } from "@/components/layout/Container"
import { sectionHeadingId, type HomeSection } from "@/content/home"
import { cn } from "@/lib/utils"

type Props = Pick<HomeSection, "id" | "eyebrow" | "title" | "titleHidden" | "variant"> & {
  children: ReactNode
  intro?: ReactNode
  className?: string
}

// Animate the inner m.div, not the anchor: a transform on <section> shifts scrollIntoView. MotionConfig's
// reducedMotion disables only transforms, not opacity, so initial is turned off manually.
const reveal = {
  initial: { opacity: 0, y: 8 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "0px 0px -10% 0px" },
  transition: { duration: 0.4, ease: "easeOut" },
} as const

export function HomeSectionShell({
  id,
  eyebrow,
  title,
  titleHidden,
  variant,
  intro,
  children,
  className,
}: Props) {
  const titleId = sectionHeadingId(id)
  const reduceMotion = useReducedMotion()
  const content = (
    <>
      {intro}
      {eyebrow && !titleHidden && (
        <p className="mb-1 text-[13px] font-medium text-muted-foreground">{eyebrow}</p>
      )}
      <h2
        id={titleId}
        tabIndex={-1}
        className={cn(
          "font-heading text-[clamp(28px,3.2vw,40px)] leading-[1.1] font-semibold tracking-[-0.03em] outline-none",
          titleHidden && "sr-only",
        )}
      >
        {title}
      </h2>
      <div className={titleHidden ? undefined : "mt-6"}>{children}</div>
    </>
  )

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn(
        "scroll-mt-(--header-h) py-8 md:py-10",
        variant === "bleed" && "dark bg-background text-foreground",
        className,
      )}
    >
      {/* The map card has its own intro; a shared fade would force extra compositing of the map canvas. */}
      <m.div {...reveal} initial={reduceMotion || variant === "card" ? false : reveal.initial}>
        {variant === "card" ? (
          <div className="px-3 md:px-4">
            <div className="dark rounded-2xl bg-background p-3 text-foreground md:p-4 lg:rounded-none lg:bg-transparent lg:p-0">
              {content}
            </div>
          </div>
        ) : (
          <Container>{content}</Container>
        )}
      </m.div>
    </section>
  )
}
