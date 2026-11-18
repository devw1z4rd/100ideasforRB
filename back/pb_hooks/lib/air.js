const API_URL =
  $os.getenv("AIR_API_URL") ||
  "https://air-quality-api.open-meteo.com/v1/air-quality";
const VARS = {
  pm2_5: "pm2_5",
  pm10: "pm10",
  no2: "nitrogen_dioxide",
  so2: "sulphur_dioxide",
  o3: "ozone",
  co: "carbon_monoxide",
  us_aqi: "us_aqi",
};
const POLLUTANTS = ["pm2_5", "pm10", "no2", "so2", "o3", "co"];
// Minsk is UTC+3 all year round.
const MINSK_OFFSET_MS = 3 * 3600 * 1000;
const MIN_HOURS_PER_DAY = 18;
const KEEP_HOURLY_DAYS = 90;

const pbDate = (ms) => new Date(ms).toISOString().replace("T", " ");

// Hours where any variable is null are skipped: PocketBase number fields can't store null, and 0 would look
// like clean air.
function fetchReadings(app, range) {
  const points = app.findRecordsByFilter(
    "air_points",
    "active = true",
    "name",
    0,
    0,
  );
  if (!points.length) return { points: 0, saved: 0, skipped: 0 };

  const url =
    `${API_URL}?latitude=${points.map((p) => p.getFloat("lat")).join(",")}` +
    `&longitude=${points.map((p) => p.getFloat("lon")).join(",")}` +
    `&hourly=${Object.values(VARS).join(",")}&${range}&timeformat=unixtime`;
  const res = $http.send({ url, method: "GET", timeout: 60 });
  if (res.statusCode !== 200)
    throw new Error(`open-meteo ${res.statusCode}: ${toString(res.body, 500)}`);
  const series = points.length === 1 ? [res.json] : res.json;
  if (!Array.isArray(series) || series.length !== points.length)
    throw new Error("open-meteo: число рядов не совпадает с числом точек");

  const now = Date.now();
  const times = series[0].hourly.time;
  const from = pbDate(times[0] * 1000);
  const to = pbDate(times[times.length - 1] * 1000);
  const existing = {};
  for (const r of app.findRecordsByFilter(
    "air_readings",
    "ts >= {:from} && ts <= {:to}",
    "",
    0,
    0,
    { from, to },
  )) {
    existing[r.getString("point") + "|" + r.getDateTime("ts").string()] = r;
  }

  const collection = app.findCollectionByNameOrId("air_readings");
  let saved = 0;
  let skipped = 0;
  app.runInTransaction((txApp) => {
    series.forEach((s, i) => {
      const point = points[i].id;
      s.hourly.time.forEach((t, j) => {
        const values = {};
        for (const [field, name] of Object.entries(VARS))
          values[field] = s.hourly[name][j];
        if (Object.values(values).some((v) => v === null || v === undefined)) {
          skipped++;
          return;
        }
        const ts = pbDate(t * 1000);
        values.is_forecast = t * 1000 > now;
        let record = existing[point + "|" + ts];
        if (
          record &&
          Object.entries(values).every(([k, v]) => record.get(k) === v)
        )
          return;
        if (!record) {
          record = new Record(collection);
          record.set("point", point);
          record.set("ts", ts);
        }
        record.load(values);
        txApp.save(record);
        saved++;
      });
    });
  });
  return { points: points.length, saved, skipped };
}

function rollupDaily(app, fromDay, toDay) {
  const cols = POLLUTANTS.map(
    (p) => `AVG(${p}) AS ${p}_avg, MAX(${p}) AS ${p}_max`,
  ).join(", ");
  // DynamicModel infers types from the template: 0 is int, -0 is float64.
  const model = { point: "", hours: 0, aqi_max: -0 };
  for (const p of POLLUTANTS) model[p + "_avg"] = model[p + "_max"] = -0;
  const collection = app.findCollectionByNameOrId("air_daily");

  let days = 0;
  let rows = 0;
  app.runInTransaction((txApp) => {
    for (
      let day = Date.parse(fromDay + "T00:00:00Z");
      day < Date.parse(toDay + "T00:00:00Z");
      day += 86400000
    ) {
      const result = arrayOf(new DynamicModel(model));
      txApp
        .db()
        .newQuery(
          `SELECT point, COUNT(*) AS hours, MAX(us_aqi) AS aqi_max, ${cols} FROM air_readings
           WHERE is_forecast = FALSE AND ts >= {:from} AND ts < {:to} GROUP BY point`,
        )
        .bind({
          from: pbDate(day - MINSK_OFFSET_MS),
          to: pbDate(day + 86400000 - MINSK_OFFSET_MS),
        })
        .all(result);
      days++;
      const date = pbDate(day);
      for (const row of result) {
        if (row.hours < MIN_HOURS_PER_DAY) continue;
        let record;
        try {
          record = txApp.findFirstRecordByFilter(
            "air_daily",
            "point = {:point} && date = {:date}",
            { point: row.point, date },
          );
        } catch {
          record = new Record(collection);
          record.set("point", row.point);
          record.set("date", date);
        }
        record.set("aqi_max", row.aqi_max);
        for (const p of POLLUTANTS) {
          record.set(p + "_avg", Math.round(row[p + "_avg"] * 10) / 10);
          record.set(p + "_max", row[p + "_max"]);
        }
        txApp.save(record);
        rows++;
      }
    }
  });
  return { days, rows };
}

function pruneHourly(app) {
  const cut = pbDate(Date.now() - KEEP_HOURLY_DAYS * 86400000);
  return app
    .db()
    .newQuery("DELETE FROM air_readings WHERE ts < {:cut}")
    .bind({ cut })
    .execute()
    .rowsAffected();
}

// Fetched in month-long chunks: Open-Meteo bills long requests as several.
function backfill(app, since) {
  const today = minskDay(0);
  let saved = 0;
  let skipped = 0;
  for (let start = since; start <= today;) {
    const endMs = Math.min(
      Date.parse(start + "T00:00:00Z") + 30 * 86400000,
      Date.parse(today + "T00:00:00Z"),
    );
    const end = new Date(endMs).toISOString().slice(0, 10);
    // The local day starts at 21:00 UTC the day before — fetch one extra day.
    const from = new Date(Date.parse(start + "T00:00:00Z") - 86400000)
      .toISOString()
      .slice(0, 10);
    const r = fetchReadings(app, `start_date=${from}&end_date=${end}`);
    saved += r.saved;
    skipped += r.skipped;
    start = new Date(endMs + 86400000).toISOString().slice(0, 10);
  }
  const forecast = fetchReadings(app, "past_days=1&forecast_days=5");
  const daily = rollupDaily(app, since, today);
  const pruned = pruneHourly(app);
  return {
    saved: saved + forecast.saved,
    skipped: skipped + forecast.skipped,
    days: daily.days,
    rows: daily.rows,
    pruned,
  };
}

// The 00:20 air_daily cron is skipped while the server is down or asleep, so this runs on every hourly fetch
// and fills a missing yesterday within an hour.
function rollupMissing(app) {
  const points = app.countRecords("air_points", $dbx.hashExp({ active: true }));
  const filled = [];
  for (const shift of [-2, -1]) {
    const day = minskDay(shift);
    const date = pbDate(Date.parse(day + "T00:00:00Z"));
    const have = app.countRecords("air_daily", $dbx.hashExp({ date }));
    if (have >= points) continue;
    rollupDaily(app, day, minskDay(shift + 1));
    filled.push(day);
  }
  return filled;
}

// Cron doesn't re-run missed jobs, and past_days=1 only reaches back to yesterday 00:00 UTC. If the last
// actual hour is older than 20 h, backfill from it instead.
function fetchLatest(app) {
  const [last] = app.findRecordsByFilter(
    "air_readings",
    "is_forecast = false",
    "-ts",
    1,
    0,
  );
  const lastMs = last ? last.getDateTime("ts").unix() * 1000 : 0;
  if (!last || Date.now() - lastMs < 20 * 3600 * 1000) {
    const r = fetchReadings(app, "past_days=1&forecast_days=5");
    return Object.assign(r, { dailyFilled: rollupMissing(app) });
  }
  const day = new Date(lastMs + MINSK_OFFSET_MS).toISOString().slice(0, 10);
  const floor = minskDay(-KEEP_HOURLY_DAYS);
  const since = day < floor ? floor : day;
  return Object.assign(backfill(app, since), { since });
}

function minskDay(shiftDays) {
  return new Date(Date.now() + MINSK_OFFSET_MS + shiftDays * 86400000)
    .toISOString()
    .slice(0, 10);
}

module.exports = {
  fetchReadings,
  fetchLatest,
  backfill,
  rollupDaily,
  rollupMissing,
  pruneHourly,
  minskDay,
  KEEP_HOURLY_DAYS,
};
