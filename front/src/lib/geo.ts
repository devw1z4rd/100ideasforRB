export type PolygonGeometry =
  { type: "Polygon"; coordinates: number[][][] } | { type: "MultiPolygon"; coordinates: number[][][][] }

const polygonsOf = (geometry: PolygonGeometry): number[][][][] =>
  geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates

// Even-odd rule; a ring is [lon, lat][]. Same check as back/pb_hooks/lib/geo.js.
function inRing(lon: number, lat: number, ring: readonly number[][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function inGeometry(lon: number, lat: number, geometry: PolygonGeometry | null | undefined): boolean {
  if (!geometry) return false
  return polygonsOf(geometry).some(
    (rings) => inRing(lon, lat, rings[0]) && !rings.slice(1).some((hole) => inRing(lon, lat, hole)),
  )
}

export function mergeEnclaves(geometries: readonly PolygonGeometry[]): PolygonGeometry {
  const polygons = geometries.flatMap(polygonsOf)
  const inner = (rings: number[][][]) => {
    const ring = rings[0]
    const sum = ring.reduce(([x, y], [lon, lat]) => [x + lon, y + lat], [0, 0])
    return [sum[0] / ring.length, sum[1] / ring.length]
  }
  const absorbed = new Set<number[][][]>()
  const merged = polygons.map(([outer, ...holes]) => [
    outer,
    ...holes.filter((hole) => {
      const fillers = polygons.filter((q) => q[0] !== outer && inRing(inner(q)[0], inner(q)[1], hole))
      fillers.forEach((q) => absorbed.add(q))
      return fillers.length === 0
    }),
  ])
  return { type: "MultiPolygon", coordinates: merged.filter((_, i) => !absorbed.has(polygons[i])) }
}

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
  project: (lon: number, lat: number) => [number, number]
}

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
