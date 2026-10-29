import { cn } from "@/lib/utils"

/** Метка черновика: неопубликованное видит только админ (API rules news/articles) */
export function DraftBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full border border-input px-2 py-0.5 font-sans text-[12px] font-medium tracking-normal text-muted-foreground",
        className,
      )}
    >
      {label}
    </span>
  )
}
