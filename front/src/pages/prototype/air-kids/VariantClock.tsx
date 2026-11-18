// PROTOTYPE — variant D "Air clock".
import { Car, Flame, Moon, School, Sun } from "lucide-react"
import { useState } from "react"
import { aqiCategory } from "@/lib/aqi"
import { mockTowns } from "./mock"
import { TownChips, VerdictFace } from "./shared"

const C = 180
const R_OUT = 158
const R_IN = 92

const polar = (r: number, hour: number) => {
  const a = (hour / 24) * Math.PI * 2 - Math.PI / 2
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const
}

function sector(h: number) {
  const [x1, y1] = polar(R_OUT, h)
  const [x2, y2] = polar(R_OUT, h + 1)
  const [x3, y3] = polar(R_IN, h + 1)
  const [x4, y4] = polar(R_IN, h)
  return `M${x1} ${y1} A${R_OUT} ${R_OUT} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${R_IN} ${R_IN} 0 0 0 ${x4} ${y4} Z`
}

function bestWindow(aqi: number[]): [number, number] {
  let best: [number, number] = [12, 13]
  let len = 0
  let start = -1
  for (let h = 8; h <= 21; h++) {
    if (aqi[h] <= 50) {
      if (start < 0) start = h
      if (h - start + 1 > len) {
        len = h - start + 1
        best = [start, h + 1]
      }
    } else start = -1
  }
  if (len > 0) return best
  const min = Math.min(...aqi.slice(8, 22))
  const h = aqi.indexOf(min, 8)
  return [h, h + 1]
}

const icons = [
  { hour: 0, Icon: Moon, label: "ночь" },
  { hour: 8, Icon: School, label: "в школу" },
  { hour: 13, Icon: Sun, label: "день" },
  { hour: 19, Icon: Flame, label: "топят печки" },
  { hour: 17.5, Icon: Car, label: "едут с работы" },
]

export function VariantClock() {
  const [townId, setTownId] = useState("gomel")
  const town = mockTowns.find((t) => t.id === townId)!
  const [now] = useState(() => new Date().getHours())
  const [from, to] = bestWindow(town.hourlyAqi)
  const [hx, hy] = polar(R_IN - 14, now + 0.5)

  return (
    <div className="flex flex-col gap-8">
      <TownChips value={townId} onChange={setTownId} />

      <div className="grid items-center gap-10 md:grid-cols-[minmax(0,420px)_1fr]">
        <svg
          viewBox="-30 -10 420 380"
          className="mx-auto w-full max-w-[420px]"
          role="img"
          aria-label={`Часы воздуха: лучше гулять с ${from} до ${to}`}
        >
          {town.hourlyAqi.map((aqi, h) => (
            <path
              key={h}
              d={sector(h)}
              fill={aqiCategory(aqi)?.color}
              stroke="var(--background)"
              strokeWidth="2"
              opacity={h >= from && h < to ? 1 : 0.8}
            />
          ))}
          {Array.from({ length: to - from }, (_, i) => (
            <path key={i} d={sector(from + i)} fill="none" stroke="var(--foreground)" strokeWidth="3" />
          ))}
          {[0, 6, 12, 18].map((h) => {
            const [x, y] = polar(R_OUT + 14, h)
            return (
              <text
                key={h}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="13"
                fill="var(--muted-foreground)"
              >
                {h}:00
              </text>
            )
          })}
          {icons.map(({ hour, Icon }) => {
            const [x, y] = polar((R_OUT + R_IN) / 2, hour + 0.5)
            return (
              <Icon
                key={hour}
                x={x - 11}
                y={y - 11}
                width={22}
                height={22}
                color="#ffffff"
                strokeWidth={2.4}
              />
            )
          })}
          <line
            x1={C}
            y1={C}
            x2={hx}
            y2={hy}
            stroke="var(--foreground)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx={C} cy={C} r="7" fill="var(--foreground)" />
        </svg>

        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <VerdictFace level="ok" />
            <div>
              <p className="text-base text-fg-secondary">Лучше всего гулять {town.inName}</p>
              <p className="font-heading text-[44px] leading-tight font-semibold tracking-[-0.03em] tabular-nums">
                с {from} до {to} часов
              </p>
            </div>
          </div>
          <p className="max-w-[46ch] text-lg leading-relaxed">
            Утром, когда все едут на работу и в школу, и вечером, когда топят печки, воздух пыльнее. Днём
            ветер и солнце его проветривают.
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            {[
              { color: "var(--aqi-good)", text: "зелёный — дыши спокойно" },
              { color: "var(--aqi-moderate)", text: "жёлтый — терпимо, но не бегай долго у дороги" },
              { color: "var(--aqi-usg)", text: "оранжевый — лучше побыть дома, если болеешь" },
              { color: "var(--foreground)", text: `стрелка — сейчас, ${now}:00` },
            ].map((l) => (
              <li key={l.text} className="flex items-center gap-2">
                <span className="size-4 rounded-full" style={{ background: l.color }} />
                {l.text}
              </li>
            ))}
          </ul>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {icons.map(({ hour, Icon, label }) => (
              <li key={hour} className="flex items-center gap-1.5">
                <Icon className="size-4" /> {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
