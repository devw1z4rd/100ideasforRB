import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"

// Общие кусочки секции «Предприятия» (§10.7): карточка и пустое состояние.

/** Карточка секции — роли темы сайта: в светлой — белая с рамкой, в тёмной — на полтона светлее страницы */
export function Panel({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-border bg-card", className)} {...props} />
}

/** Нет данных за выбранный год — пунктирная рамка вместо блока */
export function NoData({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl border border-dashed border-rule p-4 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  )
}
