// PROTOTYPE — shared bits of the variants.
import { Frown, Meh, Pause, Play, Smile } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { formatDay, mockTowns, type MockTown, type Verdict } from "./mock"

export function TownChips({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Город" className="flex flex-wrap gap-2">
      {mockTowns.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={t.id === value}
          onClick={() => onChange(t.id)}
          className={cn(
            "h-9 cursor-pointer rounded-full border px-4 text-sm transition-colors",
            t.id === value
              ? "border-foreground bg-foreground text-background"
              : "border-input hover:bg-muted",
          )}
        >
          {t.name}
        </button>
      ))}
    </div>
  )
}

export function DaySlider({
  town,
  index,
  onChange,
}: {
  town: MockTown
  index: number
  onChange: (i: number) => void
}) {
  const [playing, setPlaying] = useState(false)
  const last = town.daily.length - 1

  useEffect(() => {
    if (!playing) return
    const timer = setTimeout(() => {
      if (index >= last) setPlaying(false)
      else onChange(index + 1)
    }, 450)
    return () => clearTimeout(timer)
  }, [playing, index, last, onChange])

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label={playing ? "Пауза" : "Проиграть по дням"}
        onClick={() => {
          if (!playing && index >= last) onChange(0)
          setPlaying(!playing)
        }}
        className="grid size-10 flex-none cursor-pointer place-items-center rounded-full bg-foreground text-background"
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" fill="currentColor" />}
      </button>
      <input
        type="range"
        min={0}
        max={last}
        value={index}
        onChange={(e) => {
          setPlaying(false)
          onChange(Number(e.target.value))
        }}
        aria-label="День"
        className="h-2 min-w-0 flex-1 cursor-pointer accent-foreground"
      />
      <span className="w-28 flex-none text-right text-sm font-medium tabular-nums">
        {formatDay(town.daily[index].day)}
      </span>
    </div>
  )
}

export const levelBg: Record<Verdict["level"], string> = {
  ok: "var(--level-ok)",
  elevated: "var(--level-elevated)",
  high: "var(--level-high)",
}

export function VerdictFace({ level, className }: { level: Verdict["level"]; className?: string }) {
  const Icon = level === "ok" ? Smile : level === "elevated" ? Meh : Frown
  return (
    <span
      aria-hidden="true"
      className={cn("grid size-14 flex-none place-items-center rounded-full text-white", className)}
      style={{ background: levelBg[level] }}
    >
      <Icon className="size-9" strokeWidth={2.2} />
    </span>
  )
}

export function VerdictLine({ v, place }: { v: Verdict; place: string }) {
  return (
    <div className="flex items-center gap-4">
      <VerdictFace level={v.level} />
      <div>
        <p className="font-heading text-2xl font-semibold tracking-[-0.02em]">
          {v.title} {place}
        </p>
        <p className="text-base text-fg-secondary">{v.text}</p>
      </div>
    </div>
  )
}
