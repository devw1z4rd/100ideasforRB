import { createContext, useContext, type ComponentProps } from "react"
import { Tooltip } from "@/components/ui/tooltip"

/**
 * Static "print" of a page for the turning leaf: no tooltips or animations — there's a copy per strip and
 * side.
 */
export const StaticPage = createContext(false)

export function PageTip(props: ComponentProps<typeof Tooltip>) {
  return useContext(StaticPage) ? props.children : <Tooltip {...props} />
}
