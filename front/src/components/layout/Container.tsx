import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

/** Контейнер сетки: 1600px, поля 16px на мобиле и 40px с 768px (CLAUDE.md §10.1). */
export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-[1600px] px-4 md:px-10", className)} {...props} />
}
