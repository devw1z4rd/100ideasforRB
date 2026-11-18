import { useEffect, useState } from "react"

/** Высота sticky-шапки, px (= --header-h в tokens.css) */
export const HEADER_HEIGHT = 56

/**
 * id последней секции, чей верх ушёл под шапку. Пока ни одна не дошла — первая: над картой
 * только заголовок страницы, и вверху главной подсвечена «Карта». null — только для пустого списка.
 * В самом низу страницы активна последняя секция: иначе она может не подсветиться никогда.
 */
export function pickActiveSection(
  sections: ReadonlyArray<{ id: string; top: number }>,
  headerHeight: number,
  atBottom = false,
): string | null {
  if (atBottom) return sections.at(-1)?.id ?? null
  let active: string | null = sections[0]?.id ?? null
  for (const section of sections) {
    if (section.top <= headerHeight + 1) active = section.id
  }
  return active
}

/** Активная секция главной для подсветки навигации; пересчёт на scroll/resize через requestAnimationFrame. */
export function useActiveSection(ids: readonly string[], headerHeight = HEADER_HEIGHT): string | null {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const sections = ids.flatMap((id) => {
        const el = document.getElementById(id)
        return el ? [{ id, top: el.getBoundingClientRect().top }] : []
      })
      const root = document.documentElement
      const atBottom = window.scrollY > 0 && window.innerHeight + window.scrollY >= root.scrollHeight - 2
      setActive(pickActiveSection(sections, headerHeight, atBottom))
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
    }
  }, [ids, headerHeight])

  return active
}
