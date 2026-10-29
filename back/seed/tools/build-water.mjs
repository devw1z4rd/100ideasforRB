// Собирает back/seed/water_readings.json из ручных выписок квартальных обзоров Белгидромета (back/seed/water/*.json):
//   node back/seed/tools/build-water.mjs
// Выписка — только пункты наблюдений в Гомельской области и только то, что сказано в обзоре (CLAUDE.md §9):
// отклонения от нормативов качества воды, температурный режим, гидрология. Координат в обзорах нет — пункт ставится
// на русло реки рядом с населённым пунктом: GeoNames (geonameid ниже) → ближайшая точка линии из rivers.geojson.
import { readdir, readFile, writeFile } from "node:fs/promises";

const DIR = new URL("../water/", import.meta.url);
const OUT = new URL("../water_readings.json", import.meta.url);
const RIVERS = new URL("../../../front/public/geo/rivers.geojson", import.meta.url);

// населённый пункт → [geonameid, широта, долгота, «у кого/чего» для подписи участка]
const SETTLEMENTS = {
  Наровля: [624799, 51.7972, 29.4978, "Наровли"],
  Мозырь: [625324, 52.0416, 29.2163, "Мозыря"],
  Довляды: [628925, 51.523, 29.8697, "Довляд"],
  Милашевичи: [625172, 51.6569, 27.9297, "Милашевичей"],
  Краснобережье: [626632, 51.8793, 28.4428, "Краснобережья"],
  Лучицы: [625871, 52.4497, 28.8059, "Лучиц"],
  Светлогорск: [621074, 52.6329, 29.7389, "Светлогорска"],
  Светиловичи: [621080, 52.7936, 31.3209, "Светиловичей"],
  Лоев: [625907, 51.9412, 30.7934, "Лоева"],
  Гомель: [627907, 52.4345, 30.9754, "Гомеля"],
  Жлобин: [618806, 52.8926, 30.024, "Жлобина"],
  Речица: [622794, 52.3617, 30.3916, "Речицы"],
  Добруш: [629018, 52.4147, 31.3143, "Добруша"],
};

function snap(lines, lat, lon) {
  const cos = Math.cos((lat * Math.PI) / 180);
  let best = null;
  let bestDist = Infinity;
  for (const line of lines)
    for (const [x, y] of line) {
      const d = ((x - lon) * cos) ** 2 + (y - lat) ** 2;
      if (d < bestDist) [bestDist, best] = [d, { lat: y, lon: x }];
    }
  return best;
}

const rivers = JSON.parse(await readFile(RIVERS, "utf8")).features;
const files = (await readdir(DIR)).filter((f) => f.endsWith(".json")).sort();
const sources = [];
const readings = [];
for (const file of files) {
  const { quarter, source, readings: items } = JSON.parse(await readFile(new URL(file, DIR), "utf8"));
  const [year] = quarter.split("-");
  sources.push(source);
  for (const r of items) {
    let section = "";
    let location = null;
    if (r.settlement) {
      const s = SETTLEMENTS[r.settlement];
      if (!s) throw new Error(`${file}: нет координат для «${r.settlement}»`);
      const river = rivers.find((f) => f.properties.name === r.river);
      if (!river) throw new Error(`${file}: реки «${r.river}» нет в rivers.geojson`);
      location = snap(river.geometry.coordinates, s[1], s[2]);
      section = `${r.river} у ${s[3]}`;
    }
    readings.push({
      river: r.river,
      post: r.post,
      section,
      location,
      indicator: r.indicator,
      value: r.value ?? 0,
      unit: r.unit ?? "",
      norm: r.norm ?? 0,
      norm_type: r.norm_type ?? "",
      period: `${year}-${String(r.month).padStart(2, "0")}-01 00:00:00.000Z`,
      quarter,
      note: r.note ?? "",
      source: source.title,
    });
  }
}

await writeFile(OUT, JSON.stringify({ sources, readings }, null, 2) + "\n");
console.log(`water_readings.json: ${readings.length} записей из ${files.length} обзоров`);
