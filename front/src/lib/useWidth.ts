import { useLayoutEffect, useState, type RefObject } from "react"

/**
 * Ширина элемента, px; следит за изменением размера (окно, поворот телефона). SVG-графики рисуются
 * в настоящих пикселях по этой ширине — подписи и пунктиры остаются чёткими. 0 — пока не измерено.
 */
export function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(() => setWidth(el.clientWidth))
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}
