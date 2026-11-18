// PROTOTYPE — variant B "Window to the town".
import { useState } from "react"
import { formatDay, mockTowns, verdict } from "./mock"
import { DaySlider, TownChips, VerdictLine } from "./shared"

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

function Scene({ pm25 }: { pm25: number }) {
  const haze = clamp((pm25 - 8) / 37, 0, 0.72)
  const clean = pm25 <= 15
  const smoke = clamp(Math.round(pm25 / 6), 1, 7)
  const t = "opacity 600ms ease, fill 600ms ease"

  return (
    <svg viewBox="0 0 800 480" className="w-full" role="img" aria-label={`Вид из окна, пыль ${pm25} мкг/м³`}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5fb0ff" />
          <stop offset="1" stopColor="#d6eeff" />
        </linearGradient>
        <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8b88c" stopOpacity="0.75" />
          <stop offset="1" stopColor="#b8a77a" stopOpacity="1" />
        </linearGradient>
        <clipPath id="pane">
          <rect x="30" y="30" width="740" height="400" rx="10" />
        </clipPath>
      </defs>

      <g clipPath="url(#pane)">
        <rect x="0" y="0" width="800" height="480" fill="url(#sky)" />
        <circle cx="640" cy="110" r="46" fill="#ffd65a" style={{ opacity: 1 - haze * 0.8, transition: t }} />
        <circle
          cx="640"
          cy="110"
          r="70"
          fill="#ffd65a"
          style={{ opacity: clean ? 0.25 : 0, transition: t }}
        />

        <g fill="#ffffff" opacity="0.9">
          <ellipse cx="190" cy="100" rx="60" ry="20" />
          <ellipse cx="230" cy="88" rx="40" ry="22" />
          <ellipse cx="470" cy="140" rx="50" ry="16" />
        </g>

        <g
          fill="none"
          stroke="#2b3a48"
          strokeWidth="3"
          strokeLinecap="round"
          style={{ opacity: clean ? 1 : 0, transition: t }}
        >
          <path d="M330 120 q10 -10 20 0 q10 -10 20 0" />
          <path d="M380 95 q8 -8 16 0 q8 -8 16 0" />
        </g>

        <g fill="#a9bccd">
          <rect x="40" y="250" width="70" height="180" />
          <rect x="120" y="220" width="55" height="210" />
          <rect x="420" y="240" width="80" height="190" />
          <rect x="690" y="230" width="70" height="200" />
        </g>

        <g>
          <rect x="520" y="300" width="150" height="130" fill="#8697a8" />
          <rect x="600" y="190" width="24" height="120" fill="#7a8b9c" />
          <rect x="600" y="196" width="24" height="10" fill="#e2583a" />
          {Array.from({ length: 7 }, (_, i) => (
            <circle
              key={i}
              cx={612 - i * 16 - (i % 2) * 6}
              cy={176 - i * 14}
              r={12 + i * 3}
              fill="#9a9a94"
              style={{ opacity: i < smoke ? 0.55 - i * 0.05 : 0, transition: t }}
            />
          ))}
        </g>

        <g>
          <rect x="190" y="280" width="120" height="150" fill="#5e7286" />
          <rect x="320" y="300" width="90" height="130" fill="#6a7e92" />
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => (
              <rect
                key={`${r}-${c}`}
                x={205 + c * 36}
                y={300 + r * 38}
                width="20"
                height="22"
                fill="#ffe08a"
                opacity="0.9"
              />
            )),
          )}
        </g>

        <rect x="0" y="420" width="800" height="60" fill="#7fbf82" />
        {[80, 150, 450, 760].map((x) => (
          <g key={x}>
            <rect x={x - 4} y="390" width="8" height="40" fill="#7a5a3a" />
            <circle cx={x} cy="380" r="26" fill="#3fa66b" />
          </g>
        ))}

        <rect
          x="0"
          y="0"
          width="800"
          height="480"
          fill="url(#haze)"
          style={{ opacity: haze, transition: t }}
        />
      </g>

      <rect x="22" y="22" width="756" height="416" rx="16" fill="none" stroke="#f1ebe1" strokeWidth="18" />
      <rect x="392" y="30" width="16" height="400" fill="#f1ebe1" />
      <rect x="30" y="222" width="740" height="16" fill="#f1ebe1" />
      <rect x="10" y="434" width="780" height="34" rx="6" fill="#e7dccb" />
      <rect x="96" y="402" width="34" height="34" rx="4" fill="#d9774f" />
      <path
        d="M113 402 q-14 -26 -2 -44 M113 402 q10 -22 24 -30"
        stroke="#3fa66b"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="111" cy="356" r="9" fill="#ff8fb1" />
    </svg>
  )
}

export function VariantWindow() {
  const [townId, setTownId] = useState("mozyr")
  const town = mockTowns.find((t) => t.id === townId)!
  const [index, setIndex] = useState(() =>
    town.daily.reduce((best, d, i, all) => (d.pm25 > all[best].pm25 ? i : best), 0),
  )
  const day = town.daily[index]

  return (
    <div className="flex flex-col gap-8">
      <TownChips value={townId} onChange={setTownId} />
      <VerdictLine v={verdict(day.pm25)} place={`${town.inName}, ${formatDay(day.day)}`} />
      <div className="mx-auto w-full max-w-[960px] overflow-hidden rounded-2xl bg-muted p-3 md:p-6">
        <Scene pm25={day.pm25} />
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Так выглядело бы небо {town.inName}, если бы мелкую пыль было видно. Чем гуще пелена, тем грязнее
        воздух.
      </p>
      <DaySlider town={town} index={index} onChange={setIndex} />
    </div>
  )
}
