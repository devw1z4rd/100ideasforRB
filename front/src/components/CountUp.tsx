import { animate, useMotionValue, useReducedMotion, useTransform } from "motion/react"
import * as m from "motion/react-m"
import { useEffect, useRef } from "react"

export function CountUp({
  value,
  play,
  duration = 1.1,
  delay = 0,
}: {
  value: number
  play: boolean
  duration?: number
  delay?: number
}) {
  const reduce = useReducedMotion()
  const counted = useRef(false)
  const current = useMotionValue(reduce ? value : 0)
  const shown = useTransform(current, (v) => Math.round(v))

  useEffect(() => {
    if (!play) return
    if (reduce || counted.current) {
      current.set(value)
      return
    }
    counted.current = true
    const controls = animate(current, value, { duration, delay, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [play, value, reduce, current, duration, delay])

  return <m.span>{shown}</m.span>
}
