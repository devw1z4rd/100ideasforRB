import { useInView } from "motion/react"
import { useRef, type ReactNode } from "react"

/**
 * CSS entry animations inside stay paused on the first frame (data-play, see index.css) until the block
 * scrolls into view.
 */
export function PlayInView({
  children,
  className,
  amount = 0.25,
}: {
  children: ReactNode
  className?: string
  amount?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { once: true, amount })
  return (
    <div ref={ref} data-play={seen ? "go" : "wait"} className={className}>
      {children}
    </div>
  )
}
