import { useInView } from "motion/react"
import { useRef, type ReactNode } from "react"

/**
 * CSS-анимации внутри стоят на первом кадре, пока блок не показался на экране, и запускаются, когда до него
 * докрутили (data-play, правило — в index.css). Иначе графики и полосы отыгрывали появление ещё при загрузке
 * страницы, за экраном, и к моменту, когда до них доходили, всё уже стояло на месте. Срабатывает один раз.
 * Анимации при смене данных (новый город, период) играют как обычно — блок уже «показан».
 */
export function PlayInView({
  children,
  className,
  amount = 0.25,
}: {
  children: ReactNode
  className?: string
  /** Какая доля блока должна быть видна, чтобы запустить */
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
