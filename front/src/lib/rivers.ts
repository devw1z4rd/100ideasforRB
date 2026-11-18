// Уровни воды в реках (CLAUDE.md §10.8): ежедневные наблюдения Белгидромета на 8:00.
// Уровень — см над нулём графика поста: у каждого поста свой ноль, поэтому сравниваем только с порогами того же поста.

export type RiverPost = {
  id: string
  code: number
  name: string
  river: string
  district: string
  lat: number
  lon: number
  /** Ниже — неблагоприятно для судоходства; 0 — порога у поста нет */
  low_level: number
  /** Выше — вода выходит на пойму; 0 — порога нет */
  flood_level: number
  /** Опасный уровень; 0 — порога нет */
  danger_level: number
}

export type RiverLevel = {
  post: string
  /** "YYYY-MM-DD" — день наблюдения (8:00 по Минску) */
  day: string
  level: number
  /** Изменение за сутки, см */
  change: number
  ice: string
}

/** Как у Белгидромета на карте уровенного режима: жёлтый, зелёный, синий, красный */
export type RiverStatus = "low" | "normal" | "flood" | "danger"
export type RiverTrend = "up" | "flat" | "down"

export type PostSummary = {
  post: RiverPost
  latest: RiverLevel
  status: RiverStatus
  trend: RiverTrend
  /** Уровни по дням, от старых к новым */
  series: RiverLevel[]
  /** Сколько дней ряда уровень был ниже судоходного; null — порога нет */
  daysLow: number | null
}

/** Положение уровня относительно порогов поста; пороги 0 не учитываются */
export function riverStatus(
  level: number,
  post: Pick<RiverPost, "low_level" | "flood_level" | "danger_level">,
): RiverStatus {
  if (post.danger_level && level > post.danger_level) return "danger"
  if (post.flood_level && level > post.flood_level) return "flood"
  if (post.low_level && level < post.low_level) return "low"
  return "normal"
}

export const trendOf = (change: number): RiverTrend => (change > 0 ? "up" : change < 0 ? "down" : "flat")

/** Судоходный пост — у него есть порог судоходства */
export const navigable = (post: RiverPost) => post.low_level > 0

/** У поста есть хоть один порог — уровень можно оценить словами; без порогов — только сравнить с его прошлыми */
export const hasThresholds = (post: RiverPost) =>
  post.low_level > 0 || post.flood_level > 0 || post.danger_level > 0

const severity: Record<RiverStatus, number> = { danger: 0, flood: 1, low: 2, normal: 3 }

/**
 * Сводка по постам: последний уровень, статус, ряд за период. Посты без наблюдений пропускаются.
 * Хуже всего — сверху: опасный, пойма (и на малых реках), маловодье по доле от порога; затем обычный уровень —
 * сначала судоходные, потом с порогами поймы, в конце посты без порогов; дальше по реке и посту.
 */
export function summarizePosts(posts: readonly RiverPost[], levels: readonly RiverLevel[]): PostSummary[] {
  const byPost = new Map<string, RiverLevel[]>()
  for (const l of levels) {
    const list = byPost.get(l.post)
    if (list) list.push(l)
    else byPost.set(l.post, [l])
  }

  const result: PostSummary[] = []
  for (const post of posts) {
    const series = [...(byPost.get(post.id) ?? [])].sort((a, b) => a.day.localeCompare(b.day))
    const latest = series[series.length - 1]
    if (!latest) continue
    result.push({
      post,
      latest,
      status: riverStatus(latest.level, post),
      trend: trendOf(latest.change),
      series,
      daysLow: navigable(post) ? series.filter((l) => l.level < post.low_level).length : null,
    })
  }

  const share = (s: PostSummary) => (navigable(s.post) ? s.latest.level / s.post.low_level : 0)
  return result.sort(
    (a, b) =>
      severity[a.status] - severity[b.status] ||
      Number(navigable(b.post)) - Number(navigable(a.post)) ||
      Number(hasThresholds(b.post)) - Number(hasThresholds(a.post)) ||
      share(a) - share(b) ||
      a.post.river.localeCompare(b.post.river, "ru") ||
      a.post.name.localeCompare(b.post.name, "ru"),
  )
}

/** Самый свежий день наблюдений среди постов */
export function latestDay(summaries: readonly PostSummary[]): string | null {
  return summaries.reduce<string | null>((max, s) => (!max || s.latest.day > max ? s.latest.day : max), null)
}

/** Пороги, которые стоит показать на мини-графике: судоходный — всегда, пойма и опасный — когда уровень к ним близок */
export function chartThresholds(s: PostSummary): Array<{ kind: "low" | "flood" | "danger"; value: number }> {
  const max = Math.max(...s.series.map((l) => l.level))
  const out: Array<{ kind: "low" | "flood" | "danger"; value: number }> = []
  if (s.post.low_level) out.push({ kind: "low", value: s.post.low_level })
  if (s.post.flood_level && max >= s.post.flood_level * 0.8)
    out.push({ kind: "flood", value: s.post.flood_level })
  if (s.post.danger_level && max >= s.post.danger_level * 0.8)
    out.push({ kind: "danger", value: s.post.danger_level })
  return out
}

export type LevelZone = { kind: "low" | "flood" | "danger"; from: number; to: number }

/**
 * Шкала графика уровня поста: ряд и показанные пороги (chartThresholds) с запасом 15 %, не меньше 4 см, и зоны
 * порогов в её пределах — «мелко» под судоходным, «пойма» от поймы до опасного, «опасно» выше опасного.
 * Общая для мини-графика карточки (и подсказки на карте) и графика в окне поста.
 */
export function levelScale(s: PostSummary): { lo: number; hi: number; zones: LevelZone[] } {
  const thresholds = chartThresholds(s)
  const values = [...s.series.map((l) => l.level), ...thresholds.map((t) => t.value)]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = Math.max((max - min) * 0.15, 4)
  const lo = min - pad
  const hi = max + pad
  const at = (kind: LevelZone["kind"]) => thresholds.find((t) => t.kind === kind)?.value
  const low = at("low")
  const flood = at("flood")
  const danger = at("danger")

  const zones: LevelZone[] = []
  if (low !== undefined) zones.push({ kind: "low", from: lo, to: low })
  if (flood !== undefined) zones.push({ kind: "flood", from: flood, to: danger ?? hi })
  if (danger !== undefined) zones.push({ kind: "danger", from: danger, to: hi })
  return { lo, hi, zones }
}
