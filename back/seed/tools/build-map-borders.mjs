// Builds front/public/geo/borders.geojson from Natural Earth 1:10m.
//   NODE_USE_ENV_PROXY=1 node back/seed/tools/build-map-borders.mjs (the env var is only needed behind a
//   proxy)
// Lines along the oblast outline are dropped: the map draws that border from OSM, so Natural Earth would add
// a second, slightly offset line.
import { readFile, writeFile } from "node:fs/promises";

const OUT = new URL("../../../front/public/geo/", import.meta.url);
const NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";
const BBOX = { minLon: 25.5, maxLon: 34.0, minLat: 50.2, maxLat: 54.5 };
// Belarus region lines and the national border are kept for the whole country: the map intro shows all of
// Belarus.
const BELARUS_BOX = { minLon: 23.0, maxLon: 33.0, minLat: 51.1, maxLat: 56.3 };
const NEAR_OBLAST = 0.02;

const round = (v) => Math.round(v * 1e4) / 1e4;
const inBox = ([lon, lat], box = BBOX) =>
  lon >= box.minLon && lon <= box.maxLon && lat >= box.minLat && lat <= box.maxLat;

async function json(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

const oblast = JSON.parse(await readFile(new URL("oblast.geojson", OUT), "utf8"));
const rings = oblast.features.flatMap((f) =>
  f.geometry.type === "Polygon" ? f.geometry.coordinates : f.geometry.coordinates.flat(),
);
const segments = rings.flatMap((ring) => ring.slice(1).map((b, i) => [ring[i], b]));

const k = Math.cos((52.4 * Math.PI) / 180);
function distToSegment([x, y], [[ax, ay], [bx, by]]) {
  const px = x * k, qx = ax * k, rx = bx * k;
  const dx = rx - qx, dy = by - ay;
  const t = dx || dy ? Math.max(0, Math.min(1, ((px - qx) * dx + (y - ay) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(px - (qx + t * dx), y - (ay + t * dy));
}
const nearOblast = (p) => segments.some((s) => distToSegment(p, s) < NEAR_OBLAST);

function cut(line, box = BBOX) {
  const parts = [];
  let current = [];
  for (const p of line) {
    if (inBox(p, box) && !nearOblast(p)) current.push([round(p[0]), round(p[1])]);
    else if (current.length) {
      if (current.length > 1) parts.push(current);
      current = [];
    }
  }
  if (current.length > 1) parts.push(current);
  return parts;
}

const features = [];
for (const [file, kind] of [
  ["ne_10m_admin_0_boundary_lines_land.geojson", "country"],
  ["ne_10m_admin_1_states_provinces_lines.geojson", "region"],
]) {
  for (const f of (await json(`${NE}/${file}`)).features) {
    if (!f.geometry) continue;
    const lines = f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates;
    const p = f.properties;
    const belarus = p.ADM0_A3 === "BLR" || p.ADM0_A3_L === "BLR" || p.ADM0_A3_R === "BLR";
    const parts = lines.flatMap((line) => cut(line, belarus ? BELARUS_BOX : BBOX));
    if (parts.length)
      features.push({
        type: "Feature",
        properties: { kind, blr: belarus },
        geometry: { type: "MultiLineString", coordinates: parts },
      });
  }
}

const countries = await json(`${NE}/ne_10m_admin_0_countries.geojson`);
const belarus = countries.features.find((f) => f.properties.ADM0_A3 === "BLR");
const roundRings = (c) => (typeof c[0] === "number" ? [round(c[0]), round(c[1])] : c.map(roundRings));
features.unshift({
  type: "Feature",
  properties: { kind: "belarus" },
  geometry: { type: belarus.geometry.type, coordinates: roundRings(belarus.geometry.coordinates) },
});

await writeFile(
  new URL("borders.geojson", OUT),
  JSON.stringify({ type: "FeatureCollection", attribution: "Natural Earth (общественное достояние)", features }) + "\n",
);
console.log(`borders: ${features.filter((f) => f.properties.kind === "country").length} country, ${features.filter((f) => f.properties.kind === "region").length} region`);
