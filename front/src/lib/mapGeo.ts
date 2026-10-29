// Геометрия для карты (CLAUDE.md §10.4): подписи рек на русле, масштабная линейка.

type Lines = readonly (readonly (readonly number[])[])[]

/** Ближайшая к подсказке точка русла [lon, lat] — подпись реки ложится на линию, а не рядом. */
export function snapToLines(lines: Lines, lon: number, lat: number): { lon: number; lat: number } | null {
  const cos = Math.cos((lat * Math.PI) / 180)
  let best: { lon: number; lat: number } | null = null
  let bestDist = Infinity
  for (const line of lines) {
    for (const [x, y] of line) {
      const dist = ((x - lon) * cos) ** 2 + (y - lat) ** 2
      if (dist < bestDist) {
        bestDist = dist
        best = { lon: x, lat: y }
      }
    }
  }
  return best
}

const STEPS_KM = [1, 2, 5, 10, 20, 25, 50, 100, 200]

/**
 * Масштабная линейка: самое крупное «круглое» расстояние, которое влезает в maxPx.
 * Метры на пиксель для веб-Меркатора MapLibre (тайл 512 px): 40075016.686 · cos(φ) / (512 · 2^zoom).
 */
export function scaleBar(zoom: number, lat: number, maxPx = 120): { km: number; px: number } {
  const metersPerPx = (40_075_016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom)
  const maxKm = (metersPerPx * maxPx) / 1000
  const km = [...STEPS_KM].reverse().find((s) => s <= maxKm) ?? STEPS_KM[0]
  return { km, px: Math.round((km * 1000) / metersPerPx) }
}
