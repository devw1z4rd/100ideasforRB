// Собирает back/seed/emission_stats.json из выгрузок Белстата (dataportal.belstat.gov.by) в back/seed/belstat/:
//   node back/seed/tools/build-emissions.mjs
// Районов в открытых данных нет — самая подробная разбивка по областям (CLAUDE.md §9).
//   10301000003 — загрязняющие вещества, отходящие от стационарных источников, по областям   → generated
//   10301000004 — уловлено и (или) обезврежено, по областям                                → captured
//   10301000002 — выбросы от стационарных источников по веществам, Республика Беларусь     → stationary
//   10301000021 — выбросы от мобильных источников по веществам, Республика Беларусь        → mobile
// Выбросы предприятий области = отходящие − уловленные (так считает Белстат; сверено с буклетом и стратегией).
// Мобильные источники по областям есть только в буклетах «Охрана окружающей среды в Республике Беларусь»
// (табл. 4.2, тыс. т, целые) — внесены ниже вручную.
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

// CSV портала: «;», десятичная запятая, BOM, две строки заголовка (название, единица), затем шапка с годами; null — нет данных
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
