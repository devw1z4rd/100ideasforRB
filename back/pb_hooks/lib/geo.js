// Попадание точки в районы области по полигонам districts.geometry (GeoJSON, источник — back/seed/districts.geojson).
// Подключать внутри обработчика: require(`${__hooks}/lib/geo.js`).

// Чётно-нечётное правило; кольцо — массив [lon, lat]
function inRing(lon, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

// Внешнее кольцо полигона содержит точку, а «дырки» — нет (у Гомельского района дырки — г. Гомель)
function inGeometry(lon, lat, geometry) {
  if (!geometry) return false
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.type === "MultiPolygon" ? geometry.coordinates : []
  return polygons.some((rings) => inRing(lon, lat, rings[0]) && !rings.slice(1).some((hole) => inRing(lon, lat, hole)))
}

// id района, в который попадает точка { lat, lon }, или "" — точка вне области
function districtAt(app, point) {
  for (const d of app.findAllRecords("districts")) {
    const raw = d.getString("geometry")
    if (raw && raw !== "null" && inGeometry(point.lon, point.lat, JSON.parse(raw))) return d.id
  }
  return ""
}

module.exports = { inGeometry, districtAt }
