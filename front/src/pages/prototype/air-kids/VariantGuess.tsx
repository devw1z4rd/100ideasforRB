// PROTOTYPE — variant C "Guess where it's cleaner".
import { Check, Factory, House, RotateCcw, X } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { mockTowns, verdict, type MockTown } from "./mock"
import { VerdictFace } from "./shared"

const ROUNDS = 5
const industrial = new Set(["gomel", "mozyr", "zhlobin", "svetlogorsk"])

const yesterday = (t: MockTown) => t.daily[t.daily.length - 1].pm25

function makePairs(): Array<[MockTown, MockTown]> {
  const pairs: Array<[MockTown, MockTown]> = []
  let guard = 0
  while (pairs.length < ROUNDS && guard++ < 500) {
    const a = mockTowns[Math.floor(Math.random() * mockTowns.length)]
    const b = mockTowns[Math.floor(Math.random() * mockTowns.length)]
    if (a.id === b.id || Math.abs(yesterday(a) - yesterday(b)) < 2) continue
    if (pairs.some(([x, y]) => (x.id === a.id && y.id === b.id) || (x.id === b.id && y.id === a.id))) continue
    pairs.push([a, b])
  }
  return pairs
}

export function VariantGuess() {
  const [pairs, setPairs] = useState(makePairs)
  const [round, setRound] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)

  const done = round >= pairs.length
  const restart = () => {
    setPairs(makePairs())
    setRound(0)
    setPicked(null)
    setScore(0)
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-6 rounded-2xl bg-muted px-6 py-16 text-center">
        <p className="font-heading text-[56px] leading-none font-semibold tabular-nums">
          {score} из {pairs.length}
        </p>
        <p className="max-w-md text-lg">
          {score === pairs.length
            ? "Идеально! Ты знаешь, где в области чистый воздух."
            : score >= 3
              ? "Отлично! Заметил? В городах с заводами воздух обычно хуже."
              : "Неплохо для начала. Подсказка: где большие заводы, там пыли больше."}
        </p>
        <button
          type="button"
          onClick={restart}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-foreground px-6 text-background"
        >
          <RotateCcw className="size-4" /> Сыграть ещё
        </button>
      </div>
    )
  }

  const [a, b] = pairs[round]
  const cleaner = yesterday(a) < yesterday(b) ? a : b
  const answered = picked !== null

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <p className="font-heading text-2xl font-semibold tracking-[-0.02em] md:text-3xl">
          Где вчера было легче дышать?
        </p>
        <ol className="flex flex-none gap-1.5" aria-label={`Раунд ${round + 1} из ${pairs.length}`}>
          {pairs.map((_, i) => (
            <li
              key={i}
              className={cn(
                "size-3 rounded-full",
                i < round ? "bg-foreground" : i === round ? "bg-foreground/50" : "bg-muted",
              )}
            />
          ))}
        </ol>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[a, b].map((t) => {
          const isCleaner = t.id === cleaner.id
          const isPicked = picked === t.id
          const v = verdict(yesterday(t))
          const Icon = industrial.has(t.id) ? Factory : House
          return (
            <button
              key={t.id}
              type="button"
              disabled={answered}
              onClick={() => {
                setPicked(t.id)
                if (isCleaner) setScore((s) => s + 1)
              }}
              className={cn(
                "relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 p-6 transition-all disabled:cursor-default",
                !answered && "border-input hover:-translate-y-1 hover:border-foreground hover:shadow-lg",
                answered &&
                  isCleaner &&
                  "border-[var(--level-ok)] bg-[color-mix(in_oklab,var(--level-ok)_12%,transparent)]",
                answered && !isCleaner && "border-input opacity-80",
              )}
            >
              {answered && isPicked && (
                <span
                  className={cn(
                    "absolute top-4 right-4 grid size-8 place-items-center rounded-full text-white",
                    isCleaner ? "bg-[var(--level-ok)]" : "bg-[var(--level-high)]",
                  )}
                >
                  {isCleaner ? <Check className="size-5" /> : <X className="size-5" />}
                </span>
              )}
              {answered ? (
                <VerdictFace level={v.level} className="size-16" />
              ) : (
                <Icon className="size-14 text-muted-foreground" strokeWidth={1.5} />
              )}
              <span className="font-heading text-3xl font-semibold">{t.name}</span>
              {answered && (
                <span className="text-base">
                  <span className="font-semibold tabular-nums">{Math.round(yesterday(t))}</span> пылинок ·{" "}
                  {v.title.toLowerCase()}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex min-h-12 flex-wrap items-center justify-between gap-4">
        <p className="text-lg">
          {!answered
            ? "Нажми на город, где, по-твоему, воздух был чище."
            : picked === cleaner.id
              ? `Верно! ${cleaner.name} — чище.`
              : `Не угадал: чище было ${cleaner.inName}.`}
        </p>
        {answered && (
          <button
            type="button"
            onClick={() => {
              setRound((r) => r + 1)
              setPicked(null)
            }}
            className="h-11 cursor-pointer rounded-full bg-foreground px-6 text-background"
          >
            {round + 1 < pairs.length ? "Дальше" : "Узнать результат"}
          </button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Счёт: {score}. «Пылинки» — микрограммы мелкой пыли PM2.5 в кубометре воздуха, норма ВОЗ — 15.
      </p>
    </div>
  )
}
