import { useEffect, useRef } from "react"

/**
 * Прилипла ли sticky-панель под шапкой сайта. Следим за пустым «маячком» прямо перед панелью:
 * ушёл выше нижнего края шапки — панель прилипла. Возвращает ref для маячка и ref с флагом. Именно ref, не
 * состояние: флаг нужен только в обработчиках, а состояние перерисовывало бы весь раздел каждый раз, когда
 * панель прилипает и отлипает при прокрутке (на ноутбуке от батареи — заметный рывок).
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
