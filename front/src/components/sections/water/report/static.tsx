import { createContext, useContext, type ComponentProps } from "react"
import { Tooltip } from "@/components/ui/tooltip"

/**
 * «Отпечаток» страницы на перелистываемом листе (Leaf): та же страница, но без подсказок и анимаций —
 * копий на листе много (по одной на полоску и сторону), им нужно быть лёгкими и неподвижными.
 */
export const StaticPage = createContext(false)

/** Подсказка, которой нет на отпечатке страницы */
export function PageTip(props: ComponentProps<typeof Tooltip>) {
  return useContext(StaticPage) ? props.children : <Tooltip {...props} />
}
