import type { useMatches } from "react-router"

export type RouteHandle = { title: string }

/** Заголовок текущего маршрута из handle (см. routes.tsx). */
export function routeTitle(matches: ReturnType<typeof useMatches>): string | undefined {
  const handle = matches.at(-1)?.handle as Partial<RouteHandle> | undefined
  return handle?.title
}
