import { useLayoutEffect, useState, type RefObject } from "react"

/**
 * Положение подложки или подчёркивания активного пункта внутри группы (капсула шапки, вкладки «Воздуха»):
 * пункты помечены data-nav-key, результат — сдвиг и ширина активного относительно группы. Пока активного нет,
 * хранит прежнее место — индикатор гаснет на нём и при следующем выборе переезжает оттуда, а не из левого края.
 */
export function useIndicator(groupRef: RefObject<HTMLElement | null>, activeKey: string | null) {
  const [box, setBox] = useState<{ x: number; w: number } | null>(null)

  useLayoutEffect(() => {
    const group = groupRef.current
    if (!group || !activeKey) return
    const measure = () => {
      const el = group.querySelector<HTMLElement>(`[data-nav-key="${activeKey}"]`)
      // offsetWidth 0 — группа скрыта (капсула шапки < lg): мерить нечего
      if (el && el.offsetWidth) setBox({ x: el.offsetLeft, w: el.offsetWidth })
    }
    measure()
    if (typeof ResizeObserver === "undefined") return
    // Ширина пунктов меняется, когда догружается шрифт и когда группа появляется или перестраивается
    const observer = new ResizeObserver(measure)
    observer.observe(group)
    return () => observer.disconnect()
  }, [groupRef, activeKey])

  return box
}
