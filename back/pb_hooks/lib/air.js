// Сбор качества воздуха из Open-Meteo (CLAUDE.md §4 M2, §9) и суточные агрегаты для air_daily.
// Подключать внутри обработчика: require(`${__hooks}/lib/air.js`).

// AIR_API_URL — подмена адреса для тестов и локального прокси
const API_URL = $os.getenv("AIR_API_URL") || "https://air-quality-api.open-meteo.com/v1/air-quality"
// Поле air_readings → переменная Open-Meteo (все в мкг/м³, кроме us_aqi)
const VARS = {
  pm2_5: "pm2_5",
  pm10: "pm10",
  no2: "nitrogen_dioxide",
  so2: "sulphur_dioxide",
  o3: "ozone",
  co: "carbon_monoxide",
  us_aqi: "us_aqi",
}
const POLLUTANTS = ["pm2_5", "pm10", "no2", "so2", "o3", "co"]
// Минск круглый год UTC+3: сутки для air_daily считаются по местному времени
const MINSK_OFFSET_MS = 3 * 3600 * 1000
// Сутки попадают в air_daily, только если есть почти все часы — неполный день исказил бы средние
const MIN_HOURS_PER_DAY = 18
const KEEP_HOURLY_DAYS = 90

// Дата в формате, в котором PocketBase хранит date-поля: "2026-10-29 12:00:00.000Z"
const pbDate = (ms) => new Date(ms).toISOString().replace("T", " ")

// Забирает почасовые значения по всем активным точкам и обновляет air_readings (upsert по point + ts).
// Час, где Open-Meteo вернул null хоть по одной переменной, пропускается: number-поле PocketBase
// не хранит null, а 0 выглядел бы как чистый воздух.
function fetchReadings(app, pastDays, forecastDays) {
  const points = app.findRecordsByFilter("air_points", "active = true", "name", 0, 0)
  if (!points.length) return { points: 0, saved: 0, skipped: 0 }

  const url =
    `${API_URL}?latitude=${points.map((p) => p.getFloat("lat")).join(",")}` +
    `&longitude=${points.map((p) => p.getFloat("lon")).join(",")}` +
    `&hourly=${Object.values(VARS).join(",")}&past_days=${pastDays}&forecast_days=${forecastDays}&timeformat=unixtime`
  const res = $http.send({ url, method: "GET", timeout: 60 })
  if (res.statusCode !== 200) throw new Error(`open-meteo ${res.statusCode}: ${toString(res.body, 500)}`)
  const series = points.length === 1 ? [res.json] : res.json
  if (!Array.isArray(series) || series.length !== points.length) throw new Error("open-meteo: число рядов не совпадает с числом точек")

  const now = Date.now()
  const from = pbDate(series[0].hourly.time[0] * 1000)
  const existing = {}
  for (const r of app.findRecordsByFilter("air_readings", "ts >= {:from}", "", 0, 0, { from })) {
    existing[r.getString("point") + "|" + r.getDateTime("ts").string()] = r
  }

  const collection = app.findCollectionByNameOrId("air_readings")
  let saved = 0
  let skipped = 0
  app.runInTransaction((txApp) => {
    series.forEach((s, i) => {
      const point = points[i].id
      s.hourly.time.forEach((t, j) => {
        const values = {}
        for (const [field, name] of Object.entries(VARS)) values[field] = s.hourly[name][j]
        if (Object.values(values).some((v) => v === null || v === undefined)) {
          skipped++
          return
        }
        const ts = pbDate(t * 1000)
        values.is_forecast = t * 1000 > now
        let record = existing[point + "|" + ts]
        if (record && Object.entries(values).every(([k, v]) => record.get(k) === v)) return
        if (!record) {
          record = new Record(collection)
          record.set("point", point)
          record.set("ts", ts)
        }
        record.load(values)
        txApp.save(record)
        saved++
      })
    })
  })
  return { points: points.length, saved, skipped }
}

// Пересчитывает air_daily за местные сутки [fromDay, toDay) — строки "YYYY-MM-DD" — только по фактическим часам
function rollupDaily(app, fromDay, toDay) {
  const cols = POLLUTANTS.map((p) => `AVG(${p}) AS ${p}_avg, MAX(${p}) AS ${p}_max`).join(", ")
  // В DynamicModel 0 — целое, -0 — float64
  const model = { point: "", hours: 0, aqi_max: -0 }
  for (const p of POLLUTANTS) model[p + "_avg"] = model[p + "_max"] = -0
  const collection = app.findCollectionByNameOrId("air_daily")

  let days = 0
  let rows = 0
  app.runInTransaction((txApp) => {
    for (let day = Date.parse(fromDay + "T00:00:00Z"); day < Date.parse(toDay + "T00:00:00Z"); day += 86400000) {
      const result = arrayOf(new DynamicModel(model))
      txApp
        .db()
        .newQuery(
          `SELECT point, COUNT(*) AS hours, MAX(us_aqi) AS aqi_max, ${cols} FROM air_readings
           WHERE is_forecast = FALSE AND ts >= {:from} AND ts < {:to} GROUP BY point`,
        )
        .bind({ from: pbDate(day - MINSK_OFFSET_MS), to: pbDate(day + 86400000 - MINSK_OFFSET_MS) })
        .all(result)
      days++
      const date = pbDate(day)
      for (const row of result) {
        if (row.hours < MIN_HOURS_PER_DAY) continue
        let record
        try {
          record = txApp.findFirstRecordByFilter("air_daily", "point = {:point} && date = {:date}", { point: row.point, date })
        } catch {
          record = new Record(collection)
          record.set("point", row.point)
          record.set("date", date)
        }
        record.set("aqi_max", row.aqi_max)
        for (const p of POLLUTANTS) {
          record.set(p + "_avg", Math.round(row[p + "_avg"] * 10) / 10)
          record.set(p + "_max", row[p + "_max"])
        }
        txApp.save(record)
        rows++
      }
    }
  })
  return { days, rows }
}

// Почасовые старше 90 дней удаляются: к этому времени они уже свёрнуты в air_daily (CLAUDE.md §8)
function pruneHourly(app) {
  const cut = pbDate(Date.now() - KEEP_HOURLY_DAYS * 86400000)
  return app.db().newQuery("DELETE FROM air_readings WHERE ts < {:cut}").bind({ cut }).execute().rowsAffected()
}

// "YYYY-MM-DD" местной (минской) даты со сдвигом на shiftDays
function minskDay(shiftDays) {
  return new Date(Date.now() + MINSK_OFFSET_MS + shiftDays * 86400000).toISOString().slice(0, 10)
}

module.exports = { fetchReadings, rollupDaily, pruneHourly, minskDay, KEEP_HOURLY_DAYS }
