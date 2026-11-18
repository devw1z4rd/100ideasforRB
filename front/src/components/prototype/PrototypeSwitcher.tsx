// PROTOTYPE — плавающая панель переключения вариантов прототипа. Только в dev-сборке.
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect } from "react"
import { useSearchParams } from "react-router"

export type PrototypeVariant = { key: string; name: string }

/** Текущий вариант из `?variant=`; по умолчанию — первый */
export function usePrototypeVariant(variants: readonly PrototypeVariant[]) {
  const [params] = useSearchParams()
  const key = params.get("variant")
  return variants.find((v) => v.key === key) ?? variants[0]
}

export function PrototypeSwitcher({ variants }: { variants: readonly PrototypeVariant[] }) {
  const [, setParams] = useSearchParams()
  const current = usePrototypeVariant(variants)
  const index = variants.indexOf(current)

  const go = (step: number) => {
    const next = variants[(index + step + variants.length) % variants.length]
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.set("variant", next.key)
        return p
      },
      { replace: true, preventScrollReset: true },
    )
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el?.closest("input, textarea, select, [contenteditable]")) return
      if (e.key === "ArrowLeft") go(-1)
      if (e.key === "ArrowRight") go(1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  if (!import.meta.env.DEV) return null

  return (
    <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#111] p-1.5 text-white shadow-2xl ring-2 ring-[#ff4fd8]">
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Предыдущий вариант"
        className="grid size-9 cursor-pointer place-items-center rounded-full hover:bg-white/15"
      >
        <ChevronLeft className="size-5" />
      </button>
      <span className="min-w-[220px] px-2 text-center text-sm font-medium">
        <span className="mr-1.5 rounded bg-[#ff4fd8] px-1.5 py-0.5 text-xs font-bold text-black">
          {current.key}
        </span>
        {current.name}
        <span className="ml-1.5 text-white/50">
          {index + 1}/{variants.length}
        </span>
      </span>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Следующий вариант"
        className="grid size-9 cursor-pointer place-items-center rounded-full hover:bg-white/15"
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  )
}
