import { useReducedMotion } from "motion/react"
import * as m from "motion/react-m"
import type { ReactNode } from "react"
import { Container } from "@/components/layout/Container"
import { sectionHeadingId, type HomeSection } from "@/content/home"
import { cn } from "@/lib/utils"

type Props = Pick<HomeSection, "id" | "eyebrow" | "title" | "titleHidden" | "variant"> & {
  children: ReactNode
  /** Перед заголовком секции — например, заголовок страницы и чипы в верхней строке панели карты */
  intro?: ReactNode
  /** Поправки к отступам секции (например, плотнее сверху) */
  className?: string
}

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
        // Между соседними секциями — 64 / 80 px (низ одной + верх другой); было 96 / 128 — заголовок отрывался от раздела выше
        "scroll-mt-(--header-h) py-8 md:py-10",
        variant === "bleed" && "dark bg-background text-foreground",
        className,
      )}
    >
      {/* У карты (card) своё появление — сцена старта; общее проявление накладывалось бы на неё и
          заставляло браузер лишний раз перекомпоновывать весь холст карты */}
      <m.div {...reveal} initial={reduceMotion || variant === "card" ? false : reveal.initial}>
        {variant === "card" ? (
          // Главный акцент страницы (карта): шире контейнера, по краям экрана — только небольшие поля.
          // На десктопе без подложки — панелью становится сама карта; ниже lg подложка собирает карту
          // и панели под ней в один блок
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
