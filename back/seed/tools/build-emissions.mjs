// Builds back/seed/emission_stats.json from Belstat exports in back/seed/belstat/:
//   node back/seed/tools/build-emissions.mjs
// Datasets: 10301000003 → generated, 10301000004 → captured (by region); 10301000002 → stationary,
// 10301000021 → mobile (by pollutant, whole country).
// Regional emissions = generated − captured (Belstat's method). Mobile sources by region come from Belstat
// booklets (table 4.2) and are entered by hand below.
import { readFile, writeFile } from "node:fs/promises";

const DIR = new URL("../belstat/", import.meta.url);
const OUT = new URL("../emission_stats.json", import.meta.url);
const PORTAL = "Белстат: открытые данные (dataportal.belstat.gov.by)";
const BOOKLET = "Белстат: «Охрана окружающей среды в Республике Беларусь», 2025 и 2026";

const FILES = [
  { code: "10301000003", indicator: "generated", byPollutant: false },
  { code: "10301000004", indicator: "captured", byPollutant: false },
  { code: "10301000002", indicator: "stationary", byPollutant: true },
  { code: "10301000021", indicator: "mobile", byPollutant: true },
];

const BOOKLET_MOBILE = {
  2024: { "Брестская область": 65, "Витебская область": 39, "Гомельская область": 43, "Гродненская область": 50, "г. Минск": 74, "Минская область": 111, "Могилевская область": 41 },
  2025: { "Брестская область": 68, "Витебская область": 40, "Гомельская область": 43, "Гродненская область": 51, "г. Минск": 79, "Минская область": 120, "Могилевская область": 43 },
};

// Portal CSV: ";" separator, decimal comma, BOM, two title rows, then the year header; null = no data.
function parse(text) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const unit = lines[1].trim().replace(/\.$/, "");
  const header = lines[2].split(";");
  const yearAt = header.flatMap((h, i) => (/^\d{4}$/.test(h.trim()) ? [[i, Number(h)]] : []));
  return {
    unit,
    hasPollutant: header.length - yearAt.length === 2,
    rows: lines.slice(3).map((l) => l.split(";").map((c) => c.trim())),
    yearAt,
  };
}

const rows = [];
for (const { code, indicator, byPollutant } of FILES) {
  const { unit, rows: data, yearAt, hasPollutant } = parse(await readFile(new URL(`${code}.csv`, DIR), "utf8"));
  if (hasPollutant !== byPollutant) throw new Error(`${code}: неожиданная шапка`);
  for (const cells of data) {
    const territory = cells[0];
    const pollutant = byPollutant ? cells[1] : "";
    for (const [i, year] of yearAt) {
      if (!cells[i] || cells[i] === "null") continue;
      rows.push({ territory, year, indicator, pollutant, value: Number(cells[i].replace(",", ".")), unit, source: PORTAL });
    }
  }
}
for (const [year, byRegion] of Object.entries(BOOKLET_MOBILE)) {
  for (const [territory, value] of Object.entries(byRegion)) {
    rows.push({ territory, year: Number(year), indicator: "mobile", pollutant: "", value, unit: "тыс. т", source: BOOKLET });
  }
}

await writeFile(OUT, JSON.stringify(rows, null, 2) + "\n");
console.log(`emission_stats.json: ${rows.length} строк`);
