// Геометрия для SVG-графиков: плавная кривая и «круглые» деления оси.

type Point = readonly [x: number, y: number]

/**
 * SVG-путь через точки монотонной кубической кривой (Фриц — Карлсон): гладко, но без выбросов
 * между соседними точками — кривая не уходит выше максимума и ниже минимума данных.
 */
export function monotonePath(points: readonly Point[]): string {
  const n = points.length
  if (n === 0) return ""
  if (n === 1) return `M${points[0][0]},${points[0][1]}`
  const dx = points.slice(1).map((p, i) => p[0] - points[i][0])
  const slope = points.slice(1).map((p, i) => (p[1] - points[i][1]) / (dx[i] || 1))
  // Касательные в точках: среднее соседних наклонов, ноль на экстремумах
  const t = points.map((_, i) => {
    if (i === 0) return slope[0]
    if (i === n - 1) return slope[n - 2]
    const a = slope[i - 1]
    const b = slope[i]
    return a * b <= 0 ? 0 : (a + b) / 2
  })
  // Ограничение Фриц — Карлсона: касательные не длиннее трёх наклонов — иначе кривая перехлёстывает
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      t[i] = 0
      t[i + 1] = 0
      continue
    }
    const a = t[i] / slope[i]
    const b = t[i + 1] / slope[i]
    const h = Math.hypot(a, b)
    if (h > 3) {
      t[i] = (3 * a * slope[i]) / h
      t[i + 1] = (3 * b * slope[i]) / h
    }
  }
  const r = (v: number) => Math.round(v * 10) / 10
  let d = `M${r(points[0][0])},${r(points[0][1])}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    const h = dx[i] / 3
    d += `C${r(x0 + h)},${r(y0 + t[i] * h)},${r(x1 - h)},${r(y1 - t[i + 1] * h)},${r(x1)},${r(y1)}`
  }
  return d
}

/** Деления оси с «круглым» шагом (1, 2, 5 × 10ⁿ), около count штук внутри [lo, hi] */
export function niceTicks(lo: number, hi: number, count = 4): number[] {
  if (!(hi > lo)) return [lo]
  const raw = (hi - lo) / count
  const pow = 10 ** Math.floor(Math.log10(raw))
  // Как в d3: множитель, при котором число делений ближе всего к count (пороги — √50, √10, √2)
  const err = raw / pow
  const step = (err >= 7.07 ? 10 : err >= 3.16 ? 5 : err >= 1.41 ? 2 : 1) * pow
  const ticks: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step)
    ticks.push(Math.round(v * 1e6) / 1e6 + 0) // + 0: -0 → 0, иначе на оси «-0»
  return ticks
}
