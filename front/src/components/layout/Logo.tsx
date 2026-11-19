const WAVE_DELAYS_MS = [0, 90, 180]

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect width="24" height="24" rx="6" className="fill-foreground" />
      <g fill="none" strokeWidth="1.7" strokeLinecap="round">
        {["M5.5 8.5", "M5.5 12", "M5.5 15.5"].map((start, i) => (
          <path
            key={start}
            d={`${start}c2.2-1.5 4.3-1.5 6.5 0s4.3 1.5 6.5 0`}
            pathLength={1}
            className={`header-wave ${i === 2 ? "stroke-success" : "stroke-background"}`}
            style={{ animationDelay: `${WAVE_DELAYS_MS[i]}ms` }}
          />
        ))}
      </g>
    </svg>
  )
}
