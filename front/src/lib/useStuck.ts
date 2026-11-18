import { useEffect, useRef } from "react"

/**
 * Returns refs, not state: the flag is only read in handlers, and state would re-render the whole section
 * every time the panel sticks or unsticks while scrolling.
 */
export function useStuck() {
  const sentinel = useRef<HTMLDivElement>(null)
  const stuck = useRef(false)

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 0
    const observer = new IntersectionObserver(
      ([entry]) => {
        stuck.current = !entry.isIntersecting && entry.boundingClientRect.top <= header + 1
      },
      { rootMargin: `-${header + 1}px 0px 0px 0px` },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [sentinel, stuck] as const
}
