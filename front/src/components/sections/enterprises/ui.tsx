import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"

export function Panel({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-border bg-card", className)} {...props} />
}

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
