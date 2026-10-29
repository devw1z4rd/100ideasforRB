/** Знак логотипа: квадрат с тремя волнами (из макета, CLAUDE.md §10.2). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect width="24" height="24" rx="6" className="fill-foreground" />
      <g fill="none" strokeWidth="1.7" strokeLinecap="round">
        <path d="M5.5 8.5c2.2-1.5 4.3-1.5 6.5 0s4.3 1.5 6.5 0" className="stroke-background" />
        <path d="M5.5 12c2.2-1.5 4.3-1.5 6.5 0s4.3 1.5 6.5 0" className="stroke-background" />
        <path d="M5.5 15.5c2.2-1.5 4.3-1.5 6.5 0s4.3 1.5 6.5 0" className="stroke-success" />
      </g>
    </svg>
  )
}
