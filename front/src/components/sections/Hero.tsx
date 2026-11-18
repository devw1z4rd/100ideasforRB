import { hero } from "@/content/hero"
import { cn } from "@/lib/utils"

export function Hero({ className }: { className?: string }) {
  return (
    <h1
      id="hero-title"
      className={cn(
        "font-heading text-[clamp(32px,3.6vw,56px)] leading-[1.05] font-semibold tracking-[-0.04em] text-balance text-foreground",
        className,
      )}
    >
      {hero.title}
    </h1>
  )
}
