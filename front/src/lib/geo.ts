// Геометрия районов без карты (CLAUDE.md §10.14): попадание точки в полигон и SVG-контуры для картограммы.
// Полигоны — GeoJSON из districts.geometry; у Гомельского района внутренние кольца — г. Гомель.

export type PolygonGeometry =
  { type: "Polygon"; coordinates: number[][][] } | { type: "MultiPolygon"; coordinates: number[][][][] }

const polygonsOf = (geometry: PolygonGeometry): number[][][][] =>
  geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates

// Чётно-нечётное правило; кольцо — массив [lon, lat]. Та же проверка, что у хука обращений (back/pb_hooks/lib/geo.js)
function inRing(lon: number, lat: number, ring: readonly number[][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Точка внутри внешнего кольца и вне «дырок» */
export function inGeometry(lon: number, lat: number, geometry: PolygonGeometry | null | undefined): boolean {
  if (!geometry) return false
  return polygonsOf(geometry).some(
    (rings) => inRing(lon, lat, rings[0]) && !rings.slice(1).some((hole) => inRing(lon, lat, hole)),
  )
}

/** id района, в который попадает точка, или null — точка вне области */
export function districtAt(
  districts: readonly { id: string; geometry?: PolygonGeometry | null }[],
  lon: number,
  lat: number,
): string | null {
  return districts.find((d) => inGeometry(lon, lat, d.geometry))?.id ?? null
}

export type Projection = {
  width: number
  height: number
  /** [lon, lat] → [x, y] в координатах viewBox */
  project: (lon: number, lat: number) => [number, number]
}

/**
 * Равнопромежуточная проекция с поправкой cos(φ) по средней широте — для области размером ~300 × 220 км
 * искажения не видны. Вписывает все полигоны в ширину width.
 */
export function fitProjection(geometries: readonly PolygonGeometry[], width = 1000): Projection {
  let minLon = Infinity
  let maxLon = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity
  for (const g of geometries)
    for (const rings of polygonsOf(g))
      for (const [lon, lat] of rings[0]) {
        minLon = Math.min(minLon, lon)
        maxLon = Math.max(maxLon, lon)
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
      }
  if (!Number.isFinite(minLon)) return { width, height: 0, project: () => [0, 0] }

  const cos = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180)
  const scale = width / ((maxLon - minLon) * cos)
  return {
    width,
    height: Math.round((maxLat - minLat) * scale),
    project: (lon, lat) => [(lon - minLon) * cos * scale, (maxLat - lat) * scale],
  }
}

const round = (v: number) => Math.round(v * 10) / 10

/**
 * SVG-путь полигона: кольца — отдельные подпути, «дырки» вырезаются правилом fill-rule="evenodd".
 * Точки ближе minStep друг к другу пропускаются — у полигонов OSM тысячи вершин, на экране они не видны.
 */
export function geometryPath(geometry: PolygonGeometry, { project }: Projection, minStep = 1): string {
  let d = ""
  for (const rings of polygonsOf(geometry))
    for (const ring of rings) {
      let last: [number, number] | null = null
      ring.forEach(([lon, lat], i) => {
        const [x, y] = project(lon, lat)
        const isLast = i === ring.length - 1
        if (last && !isLast && Math.hypot(x - last[0], y - last[1]) < minStep) return
        d += `${last ? "L" : "M"}${round(x)} ${round(y)}`
        last = [x, y]
      })
      d += "Z"
    }
  return d
}
