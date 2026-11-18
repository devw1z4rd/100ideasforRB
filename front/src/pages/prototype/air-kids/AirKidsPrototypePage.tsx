// PROTOTYPE — выбросить после выбора. Четыре варианта «детского» представления данных о воздухе на одной странице,
// переключение — `?variant=A…D` и плавающая панель внизу (← → на клавиатуре). Маршрут есть только в dev-сборке,
// данные — мок (mock.ts), не настоящие.
import { Container } from "@/components/layout/Container"
import {
  PrototypeSwitcher,
  usePrototypeVariant,
  type PrototypeVariant,
} from "@/components/prototype/PrototypeSwitcher"
import { useDocumentTitle } from "@/lib/useDocumentTitle"
import { VariantClock } from "./VariantClock"
import { VariantGuess } from "./VariantGuess"
import { VariantJar } from "./VariantJar"
import { VariantWindow } from "./VariantWindow"

const variants: readonly PrototypeVariant[] = [
  { key: "A", name: "Банка воздуха" },
  { key: "B", name: "Окно в город" },
  { key: "C", name: "Угадай, где чище" },
  { key: "D", name: "Часы воздуха" },
]

const views = { A: VariantJar, B: VariantWindow, C: VariantGuess, D: VariantClock } as const

export function AirKidsPrototypePage() {
  useDocumentTitle("Прототип: воздух для детей")
  const variant = usePrototypeVariant(variants)
  const View = views[variant.key as keyof typeof views]

  return (
    <Container className="pt-10 pb-32">
      {/* Пылинки в банке плавают — анимация только для прототипа */}
      <style>{`
        @keyframes proto-drift { from { transform: translate(0, 0) } to { transform: translate(var(--dx), var(--dy)) } }
        .proto-drift { animation-name: proto-drift; animation-timing-function: ease-in-out;
          animation-iteration-count: infinite; animation-direction: alternate; }
        @media (prefers-reduced-motion: reduce) { .proto-drift { animation: none } }
      `}</style>

      <p className="inline-flex rounded-full bg-[#ff4fd8] px-3 py-1 text-xs font-bold text-black">
        ПРОТОТИП · мок-данные, не настоящие измерения
      </p>
      <h1 className="mt-4 font-heading text-[clamp(32px,4vw,48px)] leading-[1.1] font-semibold tracking-[-0.03em]">
        Воздух — понятно даже ребёнку
      </h1>
      <p className="mt-2 mb-10 text-base text-muted-foreground">
        Вариант {variant.key}: {variant.name}. Переключайте внизу или стрелками ← → на клавиатуре.
      </p>

      {/* key: при смене варианта состояние предыдущего сбрасывается */}
      <View key={variant.key} />

      <PrototypeSwitcher variants={variants} />
    </Container>
  )
}
