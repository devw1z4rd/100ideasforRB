import { useEffect, useState } from "react"

/** Sticky header height, px (= --header-h in tokens.css). */
export const HEADER_HEIGHT = 56

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
