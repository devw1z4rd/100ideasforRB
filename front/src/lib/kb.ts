// База знаний: группировка статей по рубрикам (CLAUDE.md §11).

type Categorized = { category?: string; order?: number; title: string }

export type CategoryGroup<T> = { category: string; articles: T[] }

/**
 * Статьи по рубрикам: сначала рубрики в порядке `order` из content/kb.ts, потом остальные по алфавиту,
 * без рубрики — в `other` в конце. Внутри рубрики — по полю order, затем по названию.
 */
export function groupByCategory<T extends Categorized>(
  articles: readonly T[],
  order: readonly string[],
  other: string,
): CategoryGroup<T>[] {
  const groups = new Map<string, T[]>()
  for (const a of articles) {
    const key = a.category?.trim() || other
    const list = groups.get(key)
    if (list) list.push(a)
    else groups.set(key, [a])
  }

  const rank = (c: string) => {
    if (c === other) return [2, ""] as const
    const i = order.indexOf(c)
    return i >= 0 ? ([0, String(i).padStart(3, "0")] as const) : ([1, c] as const)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => {
      const [ra, ka] = rank(a)
      const [rb, kb] = rank(b)
      return ra - rb || ka.localeCompare(kb, "ru")
    })
    .map(([category, list]) => ({
      category,
      articles: [...list].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title, "ru"),
      ),
    }))
}
