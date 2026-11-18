// The pogoda.by API is undocumented (it backs the Hydro map on the Belhydromet site). Levels are cm above
// each post's own gauge zero — compare them only with that post's thresholds.

const API_URL =
  $os.getenv("RIVER_API_URL") || "https://pogoda.by/api/v2/hydrology";
const SOURCE_TITLE =
  "Белгидромет: ежедневные гидрологические наблюдения (pogoda.by)";
const ATTEMPTS = 4;

const pbDate = (iso) => new Date(iso).toISOString().replace("T", " ");
const num = (v) =>
  v === null || v === undefined || v === "" ? null : Number(v);

function getJson(path) {
  let error;
  for (let i = 0; i < ATTEMPTS; i++) {
    try {
      const res = $http.send({
        url: `${API_URL}/${path}`,
        method: "GET",
        headers: { accept: "*/*" },
        timeout: 30,
      });
      if (res.statusCode === 200 && Array.isArray(res.json)) return res.json;
      error = new Error(
        `pogoda.by ${path}: ${res.statusCode} ${toString(res.body, 300)}`,
      );
      if (
        res.statusCode >= 400 &&
        res.statusCode < 500 &&
        res.statusCode !== 429
      )
        break;
    } catch (e) {
      error = e;
    }
    sleep(2000 * 2 ** i);
  }
  throw error;
}

function districtFinder(app) {
  const { inGeometry } = require(`${__hooks}/lib/geo.js`);
  const districts = app
    .findAllRecords("districts")
    .map((d) => ({ id: d.id, raw: d.getString("geometry") }))
    .filter((d) => d.raw && d.raw !== "null")
    .map((d) => ({ id: d.id, geometry: JSON.parse(d.raw) }));
  const at = (lat, lon) =>
    districts.find((d) => inGeometry(lon, lat, d.geometry))?.id || "";
  // Posts on the border Dnieper sit just outside the OSM polygon (Loyew is 0.5 km out), so search within 1
  // km.
  return (lat, lon) => {
    let id = at(lat, lon);
    for (const km of [0.5, 1]) {
      for (let k = 0; k < 16 && !id; k++) {
        const a = (Math.PI * k) / 8;
        id = at(
          lat + (km / 111.32) * Math.sin(a),
          lon + (km / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.cos(a),
        );
      }
    }
    return id;
  };
}

function syncPosts(app) {
  const markers = getJson("hydro-markers");
  const districtAt = districtFinder(app);
  let source = "";
  try {
    source = app.findFirstRecordByData("sources", "title", SOURCE_TITLE).id;
  } catch {}

  const collection = app.findCollectionByNameOrId("river_posts");
  const posts = [];
  const latest = {};
  for (const m of markers) {
    const lat = num(m.LATITUDE);
    const lon = num(m.LONGITUDE);
    const code = num(m.ind ?? m.StationId);
    if (lat === null || lon === null || !code) continue;
    const district = districtAt(lat, lon);
    if (!district) continue;

    let record;
    try {
      record = app.findFirstRecordByData("river_posts", "code", code);
    } catch {
      record = new Record(collection);
    }
    // A missing threshold is stored as 0 (number fields can't hold null); the frontend reads 0 as "no
    // threshold".
    record.load({
      code,
      name: m.punkt,
      river: m.reka,
      district,
      lat,
      lon,
      low_level: num(m.lowlev) ?? 0,
      flood_level: num(m.outlev) ?? 0,
      danger_level: num(m.danglev) ?? 0,
      source,
    });
    app.save(record);
    posts.push(record);
    latest[code] = m;
  }
  return { posts, latest, total: markers.length };
}

// Each run re-walks the whole month, so missed days backfill themselves.
function fetchLevels(app) {
  const { posts, latest, total } = syncPosts(app);
  const collection = app.findCollectionByNameOrId("river_levels");
  let saved = 0;
  let failed = 0;

  for (const post of posts) {
    const code = post.getInt("code");
    let rows;
    try {
      rows = getJson(`graph/${code}`);
    } catch (e) {
      failed++;
      app.logger().warn("river_fetch: graph", "code", code, "error", String(e));
      rows = [latest[code]];
    }

    const existing = {};
    for (const r of app.findRecordsByFilter(
      "river_levels",
      "post = {:post}",
      "-date",
      60,
      0,
      { post: post.id },
    )) {
      existing[r.getDateTime("date").string()] = r;
    }

    app.runInTransaction((txApp) => {
      for (const row of rows) {
        const level = num(row.ur8);
        if (!row.DateTime || level === null) continue;
        const date = pbDate(row.DateTime);
        const values = {
          level,
          change: num(row.izur) ?? 0,
          ice: row.ledov || "",
          ice_thickness: num(row.tol_led) ?? 0,
          state: row.sosvo || "",
        };
        let record = existing[date];
        if (
          record &&
          Object.entries(values).every(([k, v]) => record.get(k) === v)
        )
          continue;
        if (!record) {
          record = new Record(collection);
          record.set("post", post.id);
          record.set("date", date);
        }
        record.load(values);
        txApp.save(record);
        saved++;
      }
    });
  }
  return { markers: total, posts: posts.length, saved, failed };
}

function hasLatest(app) {
  const now = new Date();
  const day = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 5),
  );
  if (now.getUTCHours() * 60 + now.getUTCMinutes() < 6 * 60 + 40)
    day.setUTCDate(day.getUTCDate() - 1);
  return (
    app.findRecordsByFilter("river_levels", "date >= {:date}", "", 1, 0, {
      date: pbDate(day),
    }).length > 0
  );
}

module.exports = { fetchLevels, hasLatest, SOURCE_TITLE };
