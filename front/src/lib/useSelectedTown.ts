import { useCallback } from "react"
import { useSearchParams } from "react-router"
import { air } from "@/content/air"

type Town = { id: string; name: string }

/**
 * Выбранный город главной — общий для карты и раздела «Воздух»: живёт в адресе (`?town=Мозырь`),
 * поэтому выбор на карте переключает график, а ссылкой можно поделиться. По умолчанию — Гомель.
 */
export function useSelectedTown(towns: readonly Town[] | undefined): [string | null, (id: string) => void] {
  const [params, setParams] = useSearchParams()
  const name = params.get("town")
  const selected =
    towns?.find((t) => t.name === name) ?? towns?.find((t) => t.name === air.defaultTown) ?? towns?.[0]

  const select = useCallback(
    (id: string) => {
      const town = towns?.find((t) => t.id === id)
      if (!town) return
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set("town", town.name)
          return next
        },
        // Смена города — не новая страница: без записи в историю и без прокрутки
        { replace: true, preventScrollReset: true },
      )
    },
    [towns, setParams],
  )

  return [selected?.id ?? null, select]
}
