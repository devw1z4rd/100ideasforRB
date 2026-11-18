import { useCallback } from "react"
import { useSearchParams } from "react-router"
import { air } from "@/content/air"

type Town = { id: string; name: string }

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
        { replace: true, preventScrollReset: true },
      )
    },
    [towns, setParams],
  )

  return [selected?.id ?? null, select]
}
