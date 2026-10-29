// Собирает статичные слои карты (CLAUDE.md §7, §9, §10.4) в front/public/geo/:
//   oblast.geojson — граница Гомельской области, OpenStreetMap (ODbL), relation 59161, через Nominatim lookup;
//   rivers.geojson — реки Natural Earth 1:10m (общественное достояние), обрезанные по рамке области.
//   NODE_USE_ENV_PROXY=1 node back/seed/tools/build-map-geo.mjs   (переменная — только за прокси)
// Районы карта берёт из PocketBase (districts.geometry), не отсюда.
import { mkdir, writeFile } from "node:fs/promises";

const OUT = new URL("../../../front/public/geo/", import.meta.url);
const OBLAST_RELATION = 59161;
const NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";
// Рамка видимой области карты: реки, как в макете, тянутся за границу области до краёв карты
const BBOX = { minLon: 26.0, maxLon: 33.5, minLat: 50.5, maxLat: 54.2 };
// Natural Earth name → подпись и ранг: major — крупные реки с подписью на карте, minor — тонкие без подписи
const RIVERS = {
  Dnipro: { name: "Днепр", major: true },
  Pripyat: { name: "Припять", major: true },
  Sozh: { name: "Сож", major: true },
  Byarezina: { name: "Березина", major: true },
  Byesyedz: { name: "Беседь" },
  Iputs: { name: "Ипуть" },
  Ptsich: { name: "Птичь" },
  Ubort: { name: "Уборть" },
  Druts: { name: "Друть" },
  Haryn: { name: "Горынь" },
  Uzh: { name: "Уж" },
  Snov: { name: "Снов" },
  Desna: { name: "Десна" },
};

const UA = { "User-Agent": "eco-gomel-seed/0.1 (+https://github.com/devw1z4rd/100ideasforRB)" };
const round = (v) => Math.round(v * 1e4) / 1e4;
const inBox = ([lon, lat]) => lon >= BBOX.minLon && lon <= BBOX.maxLon && lat >= BBOX.minLat && lat <= BBOX.maxLat;

async function json(url, headers = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

// Линия режется на куски, лежащие внутри рамки; кусок из одной точки отбрасывается
function clip(line) {
  const parts = [];
  let current = [];
  for (const p of line) {
    if (inBox(p)) current.push([round(p[0]), round(p[1])]);
    else if (current.length) {
      if (current.length > 1) parts.push(current);
      current = [];
    }
  }
  if (current.length > 1) parts.push(current);
  return parts;
}

const lookup = new URL("https://nominatim.openstreetmap.org/lookup");
lookup.search = new URLSearchParams({
  osm_ids: `R${OBLAST_RELATION}`,
  format: "jsonv2",
  polygon_geojson: "1",
  polygon_threshold: "0.002",
});
const [oblast] = await json(lookup, UA);
const roundCoords = (c) => (typeof c[0] === "number" ? [round(c[0]), round(c[1])] : c.map(roundCoords));

const byName = new Map();
for (const file of ["ne_10m_rivers_lake_centerlines.geojson", "ne_10m_rivers_europe.geojson"]) {
  for (const f of (await json(`${NE}/${file}`)).features) {
    const meta = RIVERS[f.properties.name];
    if (!meta) continue;
    const lines = f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates;
    const parts = lines.flatMap(clip);
    if (!parts.length) continue;
    const prev = byName.get(meta.name);
    byName.set(meta.name, { ...meta, lines: [...(prev?.lines ?? []), ...parts] });
  }
}

const attribution = {
  oblast: "© OpenStreetMap contributors (ODbL)",
  rivers: "Natural Earth (общественное достояние)",
};
await mkdir(OUT, { recursive: true });
await writeFile(
  new URL("oblast.geojson", OUT),
  JSON.stringify({
    type: "FeatureCollection",
    attribution: attribution.oblast,
    features: [{ type: "Feature", properties: { name: "Гомельская область" }, geometry: { ...oblast.geojson, coordinates: roundCoords(oblast.geojson.coordinates) } }],
  }) + "\n",
);
await writeFile(
  new URL("rivers.geojson", OUT),
  JSON.stringify({
    type: "FeatureCollection",
    attribution: attribution.rivers,
    features: [...byName.values()].map(({ name, major, lines }) => ({
      type: "Feature",
      properties: { name, major: Boolean(major) },
      geometry: { type: "MultiLineString", coordinates: lines },
    })),
  }) + "\n",
);
console.log(`oblast: ${oblast.geojson.type}; rivers: ${[...byName.keys()].join(", ")}`);
