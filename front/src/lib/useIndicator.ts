import { useLayoutEffect, useState, type RefObject } from "react"

export function useIndicator(groupRef: RefObject<HTMLElement | null>, activeKey: string | null) {
  const [box, setBox] = useState<{ x: number; w: number } | null>(null)

  useLayoutEffect(() => {
    const group = groupRef.current
    if (!group || !activeKey) return
    const measure = () => {
      const el = group.querySelector<HTMLElement>(`[data-nav-key="${activeKey}"]`)
      if (el && el.offsetWidth) setBox({ x: el.offsetLeft, w: el.offsetWidth })
    }
    measure()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(measure)
    observer.observe(group)
    return () => observer.disconnect()
  }, [groupRef, activeKey])

  return box
}
