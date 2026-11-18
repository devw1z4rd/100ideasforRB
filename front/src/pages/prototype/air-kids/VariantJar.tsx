// PROTOTYPE — variant A "Air jar".
import { useMemo, useState, type CSSProperties } from "react"
import { formatDay, mockTowns, verdict, WHO_PM25 } from "./mock"
import { DaySlider, TownChips, VerdictLine } from "./shared"

const POOL = 110

function seeded(i: number) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

const makeParticles = (o: number) =>
  Array.from({ length: POOL }, (_, i) => ({
    x: 34 + seeded(i + o) * 152,
    y: 74 + seeded(i + o + 500) * 200,
    r: 2.6 + seeded(i + o + 900) * 1.6,
    dur: 4 + seeded(i + o + 1300) * 5,
    delay: -seeded(i + o + 1700) * 8,
    dx: (seeded(i + o + 2100) - 0.5) * 18,
    dy: (seeded(i + o + 2500) - 0.5) * 22,
  }))
const pools = { town: makeParticles(0), norm: makeParticles(7000) }

const plural = (n: number) => {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return "пылинка"
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "пылинки"
  return "пылинок"
}

function Jar({
  count,
  label,
  sub,
  tone,
}: {
  count: number
  label: string
  sub: string
  tone: "town" | "norm"
}) {
  const id = `jar-${tone}`
  return (
    <figure className="flex flex-col items-center gap-3">
      <svg
        viewBox="0 0 220 300"
        className="w-full max-w-[260px]"
        role="img"
        aria-label={`${label}: ${count} ${plural(count)}`}
      >
        <defs>
          <clipPath id={id}>
            <rect x="22" y="60" width="176" height="230" rx="30" />
          </clipPath>
          <linearGradient id={`${id}-glass`} x1="0" x2="1">
            <stop offset="0" stopColor="#eaf4ff" stopOpacity="0.9" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="1" stopColor="#e3eefb" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <rect x="56" y="8" width="108" height="26" rx="8" fill={tone === "town" ? "#3b3f3d" : "#4cc38a"} />
        <rect x="64" y="34" width="92" height="28" rx="6" fill="#f3f6f9" stroke="#c9d3dd" strokeWidth="2" />
        <rect
          x="22"
          y="60"
          width="176"
          height="230"
          rx="30"
          fill={`url(#${id}-glass)`}
          stroke="#c9d3dd"
          strokeWidth="3"
        />
        <g clipPath={`url(#${id})`}>
          {pools[tone].map((p, i) => (
            <g
              key={i}
              className="proto-drift"
              style={
                {
                  "--dx": `${p.dx}px`,
                  "--dy": `${p.dy}px`,
                  animationDuration: `${p.dur}s`,
                  animationDelay: `${p.delay}s`,
                } as CSSProperties
              }
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={p.r}
                fill="#6f6250"
                style={{ opacity: i < count ? 0.85 : 0, transition: "opacity 400ms ease" }}
              />
            </g>
          ))}
        </g>
        <rect x="36" y="80" width="10" height="150" rx="5" fill="#ffffff" opacity="0.7" />
      </svg>
      <figcaption className="text-center">
        <span className="block text-lg font-semibold">{label}</span>
        <span className="block text-sm text-muted-foreground">{sub}</span>
        <span className="mt-1 block font-heading text-3xl font-semibold tabular-nums">
          {count} <span className="text-base font-normal text-muted-foreground">{plural(count)}</span>
        </span>
      </figcaption>
    </figure>
  )
}

export function VariantJar() {
  const [townId, setTownId] = useState("gomel")
  const town = mockTowns.find((t) => t.id === townId)!
  const [index, setIndex] = useState(() =>
    town.daily.reduce((best, d, i, all) => (d.pm25 > all[best].pm25 ? i : best), 0),
  )
  const day = town.daily[index]
  const count = Math.min(POOL, Math.round(day.pm25))
  const v = useMemo(() => verdict(day.pm25), [day.pm25])

  return (
    <div className="flex flex-col gap-8">
      <TownChips value={townId} onChange={setTownId} />
      <VerdictLine v={v} place={`${town.inName}, ${formatDay(day.day)}`} />

      <div className="grid grid-cols-2 items-end gap-4 rounded-2xl bg-muted px-4 py-8 md:gap-16 md:px-16">
        <Jar count={count} label={town.name} sub={formatDay(day.day)} tone="town" />
        <Jar count={WHO_PM25} label="Как должно быть" sub="по норме ВОЗ" tone="norm" />
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Одна точка — 1 микрограмм самой мелкой пыли (PM2.5) в кубометре воздуха. Чем больше точек, тем грязнее
        воздух.
      </p>

      <DaySlider town={town} index={index} onChange={setIndex} />
    </div>
  )
}
