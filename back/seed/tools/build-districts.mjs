// Собирает back/seed/districts.geojson: 21 район + г. Гомель (CLAUDE.md §8, §9).
//   node back/seed/tools/build-districts.mjs
// Границы и белорусские названия — OpenStreetMap (ODbL) через Nominatim lookup, один запрос.
// Центры — райцентры из GeoNames (CC BY 4.0, выгрузка BY.zip), geonameid указан у каждой записи.
// У Гомельского района в OSM есть «дырки» под г. Гомель, поэтому точка попадает ровно в один полигон.
import { writeFile } from "node:fs/promises";

// [название, OSM relation, geonameid райцентра, широта, долгота]
const DISTRICTS = [
  ["Брагинский", 70801, 629646, 51.79067, 30.26709],
  ["Буда-Кошелёвский", 59175, 629564, 52.71725, 30.5679],
  ["Ветковский", 70795, 620214, 52.55428, 31.18067],
  ["Гомельский", 1469691, 627907, 52.4345, 30.9754],
  ["Добрушский", 59092, 629018, 52.41471, 31.31429],
  ["Ельский", 70810, 619598, 51.81363, 29.1544],
  ["Житковичский", 71149, 618815, 52.2168, 27.8561],
  ["Жлобинский", 59167, 618806, 52.8926, 30.024],
  ["Калинковичский", 70814, 627751, 52.1323, 29.3257],
  ["Кормянский", 59149, 626917, 53.1301, 30.8016],
  ["Лельчицкий", 71147, 626188, 51.78613, 28.32824],
  ["Лоевский", 70799, 625907, 51.94115, 30.79343],
  ["Мозырский", 70815, 625324, 52.04162, 29.21631],
  ["Наровлянский", 70809, 624799, 51.79724, 29.49784],
  ["Октябрьский", 59755, 624199, 52.64844, 28.87993],
  ["Петриковский", 71145, 623581, 52.1299, 28.49625],
  ["Речицкий", 70812, 622794, 52.3617, 30.3916],
  ["Рогачёвский", 59174, 622739, 53.09255, 30.04862],
  ["Светлогорский", 59137, 621074, 52.6329, 29.7389],
  ["Хойникский", 70802, 627362, 51.90773, 29.98258],
  ["Чечерский", 59178, 629390, 52.9164, 30.9179],
  ["г. Гомель", 163244, 627907, 52.4345, 30.9754],
];

// ~100 м: достаточно для привязки обращения к району и для карты области
const SIMPLIFY_DEG = 0.001;
const OUT = new URL("../districts.geojson", import.meta.url);

const round = (v) => Math.round(v * 1e5) / 1e5;
const roundCoords = (c) => (typeof c[0] === "number" ? [round(c[0]), round(c[1])] : c.map(roundCoords));

const url = new URL("https://nominatim.openstreetmap.org/lookup");
url.search = new URLSearchParams({
  osm_ids: DISTRICTS.map(([, rel]) => `R${rel}`).join(","),
  format: "jsonv2",
  polygon_geojson: "1",
  polygon_threshold: String(SIMPLIFY_DEG),
  namedetails: "1",
  "accept-language": "ru",
});
const res = await fetch(url, { headers: { "User-Agent": "eco-gomel-seed/0.1 (+https://github.com/devw1z4rd/100ideasforRB)" } });
if (!res.ok) throw new Error(`nominatim ${res.status}`);
const byId = new Map((await res.json()).map((p) => [p.osm_id, p]));

const features = DISTRICTS.map(([name, rel, geonameid, lat, lon]) => {
  const place = byId.get(rel);
  if (!place) throw new Error(`OSM relation ${rel} (${name}) не найдена`);
  if (!/^(Polygon|MultiPolygon)$/.test(place.geojson.type)) throw new Error(`${name}: ${place.geojson.type}`);
  const be = (place.namedetails?.["name:be"] ?? "").replace(/ раён$/, "");
  return {
    type: "Feature",
    properties: {
      name,
      name_be: name === "г. Гомель" ? `г. ${be}` : be,
      center: { lat, lon },
      osm_relation: rel,
      geonameid,
    },
    geometry: { type: place.geojson.type, coordinates: roundCoords(place.geojson.coordinates) },
  };
});

const collection = {
  type: "FeatureCollection",
  attribution: "Границы и name_be: © OpenStreetMap contributors (ODbL). Центры: GeoNames (CC BY 4.0).",
  generated_at: new Date().toISOString().slice(0, 10),
  features,
};
await writeFile(OUT, JSON.stringify(collection) + "\n");
console.log(`districts.geojson: ${features.length} записей, ${features.map((f) => f.properties.name_be).join(", ")}`);
