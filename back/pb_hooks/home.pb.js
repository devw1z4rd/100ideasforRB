/// <reference path="../pb_data/types.d.ts" />
// Home page first-screen data in one response, requested straight from index.html while JS loads. Must return
// the same rows and fields as the matching queries in front/src/api (air.ts, reference.ts, rivers.ts,
// water.ts) — change both together.

routerAdd("GET", "/api/eco/home", (e) => {
  const DAY = 86400000;
  const MINSK = 3 * 3600000;
  const now = Date.now();
  const pbDate = (ms) => new Date(ms).toISOString().replace("T", " ");
  const minskDay = (ms) => new Date(ms + MINSK).toISOString().slice(0, 10);
  const find = (collection, filter, sort, params) =>
    e.app.findRecordsByFilter(collection, filter, sort, 0, 0, params || {});
  const pick = (record, strings, numbers) => {
    const out = {};
    for (const f of strings) out[f] = record.getString(f);
    for (const f of numbers) out[f] = record.getFloat(f);
    return out;
  };

  const points = find("air_points", "active = true", "name").map((r) => ({
    ...pick(r, ["id", "name", "district"], ["lat", "lon"]),
    active: true,
  }));

  const districts = find("districts", "id != ''", "name").map((r) => ({
    ...pick(r, ["id", "name", "name_be"], []),
    geometry: r.get("geometry"),
  }));

  const latest = find(
    "air_readings",
    "is_forecast = false && ts >= {:since}",
    "-ts",
    {
      since: pbDate(now - 3 * 3600000),
    },
  ).map((r) =>
    pick(
      r,
      ["point", "ts"],
      ["pm2_5", "pm10", "no2", "so2", "o3", "co", "us_aqi"],
    ),
  );

  const to = minskDay(now - DAY);
  const from = minskDay(now - 30 * DAY);
  const daily = find("air_daily", "date >= {:from} && date <= {:to}", "date", {
    from: `${from} 00:00:00.000Z`,
    to: `${to} 00:00:00.000Z`,
  }).map((r) =>
    pick(
      r,
      ["point", "date"],
      ["aqi_max", "pm2_5_avg", "pm10_avg", "no2_avg", "so2_avg"],
    ),
  );

  const riverPosts = find("river_posts", "id != ''", "river,name").map((r) =>
    pick(
      r,
      ["id", "name", "river", "district"],
      ["code", "lat", "lon", "low_level", "flood_level", "danger_level"],
    ),
  );
  const riverLevels = find("river_levels", "date >= {:since}", "date", {
    since: pbDate(now - 31 * DAY),
  }).map((r) => pick(r, ["post", "date", "ice"], ["level", "change"]));

  const sourceUrls = {};
  const sourceUrl = (id) => {
    if (!id) return "";
    if (!(id in sourceUrls)) {
      try {
        sourceUrls[id] = e.app.findRecordById("sources", id).getString("url");
      } catch (_) {
        sourceUrls[id] = "";
      }
    }
    return sourceUrls[id];
  };
  const water = find("water_readings", "id != ''", "-quarter,river,post").map(
    (r) => ({
      ...pick(
        r,
        [
          "river",
          "post",
          "section",
          "indicator",
          "unit",
          "norm_type",
          "period",
          "quarter",
          "note",
        ],
        ["value", "norm"],
      ),
      location: r.get("location"),
      sourceUrl: sourceUrl(r.getString("source")),
    }),
  );

  // Don't cache: "now" values must stay fresh.
  e.response.header().set("Cache-Control", "no-store");
  return e.json(200, {
    points,
    districts,
    latest,
    daily: { from, to, rows: daily },
    riverPosts,
    riverLevels,
    water,
  });
});
