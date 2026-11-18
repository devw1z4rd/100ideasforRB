import { useSyncExternalStore } from "react"

/** Совпадает ли медиазапрос сейчас; подписывается на изменения. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener("change", onChange)
      return () => list.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Мышь или тачпад с наведением — свои выпадающие списки и подсказки; касание — нативные элементы */
export const FINE_POINTER = "(hover: hover) and (pointer: fine)"
export const useFinePointer = () => useMediaQuery(FINE_POINTER)
