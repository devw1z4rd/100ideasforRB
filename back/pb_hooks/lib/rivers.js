// Уровни воды в реках (CLAUDE.md §8, §9): ежедневные наблюдения Белгидромета с pogoda.by → river_posts, river_levels.
// Подключать внутри обработчика: require(`${__hooks}/lib/rivers.js`).
//
// API pogoda.by не документирован — им пользуется карта «Гидро» на сайте Белгидромета:
//   hydro-markers          — все посты страны: последний уровень в 8:00, пороги, состояние реки;
//   graph/<код>            — тот же пост за последние 30 дней.
// Уровень — см над нулём графика поста: сравнивать можно только с порогами того же поста.

// RIVER_API_URL — подмена адреса для тестов и локального прокси
const API_URL = $os.getenv("RIVER_API_URL") || "https://pogoda.by/api/v2/hydrology"
const SOURCE_TITLE = "Белгидромет: ежедневные гидрологические наблюдения (pogoda.by)"
// pogoda.by иногда рвёт соединение — повторяем с паузой
const ATTEMPTS = 4

const pbDate = (iso) => new Date(iso).toISOString().replace("T", " ")
const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v))

function getJson(path) {
  let error
  for (let i = 0; i < ATTEMPTS; i++) {
    try {
      const res = $http.send({
        url: `${API_URL}/${path}`,
        method: "GET",
        headers: { accept: "*/*" },
        timeout: 30,
      })
      if (res.statusCode === 200 && Array.isArray(res.json)) return res.json
      error = new Error(`pogoda.by ${path}: ${res.statusCode} ${toString(res.body, 300)}`)
      // 4xx не исправится повтором (кроме 429)
      if (res.statusCode >= 400 && res.statusCode < 500 && res.statusCode !== 429) break
    } catch (e) {
      error = e
    }
    sleep(2000 * 2 ** i)
  }
  throw error
}

// id района, в который попадает точка, или "" — пост вне области. Полигоны читаются один раз на весь сбор.
function districtFinder(app) {
  const { inGeometry } = require(`${__hooks}/lib/geo.js`)
  const districts = app
    .findAllRecords("districts")
    .map((d) => ({ id: d.id, raw: d.getString("geometry") }))
    .filter((d) => d.raw && d.raw !== "null")
    .map((d) => ({ id: d.id, geometry: JSON.parse(d.raw) }))
  const at = (lat, lon) => districts.find((d) => inGeometry(lon, lat, d.geometry))?.id || ""
  // Посты на пограничном Днепре стоят у самой границы (Лоев — в 0,5 км за полигоном OSM): ищем район в радиусе до 1 км
  return (lat, lon) => {
    let id = at(lat, lon)
    for (const km of [0.5, 1]) {
      for (let k = 0; k < 16 && !id; k++) {
        const a = (Math.PI * k) / 8
        id = at(lat + (km / 111.32) * Math.sin(a), lon + (km / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.cos(a))
      }
    }
    return id
  }
}

// Посты области из hydro-markers → river_posts (upsert по коду поста: пороги и названия могут меняться).
// Возвращает записи постов и последние наблюдения по коду — на случай, если graph поста не ответит.
function syncPosts(app) {
  const markers = getJson("hydro-markers")
  const districtAt = districtFinder(app)
  let source = ""
  try {
    source = app.findFirstRecordByData("sources", "title", SOURCE_TITLE).id
  } catch {
    // источник появится после `pocketbase seed`
  }

  const collection = app.findCollectionByNameOrId("river_posts")
  const posts = []
  const latest = {}
  for (const m of markers) {
    const lat = num(m.LATITUDE)
    const lon = num(m.LONGITUDE)
    const code = num(m.ind ?? m.StationId)
    if (lat === null || lon === null || !code) continue
    const district = districtAt(lat, lon)
    if (!district) continue

    let record
    try {
      record = app.findFirstRecordByData("river_posts", "code", code)
    } catch {
      record = new Record(collection)
    }
    // Порога у поста может не быть (null) — number-поле хранит 0, на фронте 0 значит «порога нет»
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
    })
    app.save(record)
    posts.push(record)
    latest[code] = m
  }
  return { posts, latest, total: markers.length }
}

// Наблюдения за 30 дней по каждому посту → river_levels (upsert по post + date, без изменений не пересохраняется).
// Каждый запуск заново проходит месяц, поэтому пропущенные дни (упал cron, не ответил сайт) догружаются сами.
function fetchLevels(app) {
  const { posts, latest, total } = syncPosts(app)
  const collection = app.findCollectionByNameOrId("river_levels")
  let saved = 0
  let failed = 0

  for (const post of posts) {
    const code = post.getInt("code")
    let rows
    try {
      rows = getJson(`graph/${code}`)
    } catch (e) {
      failed++
      app.logger().warn("river_fetch: graph", "code", code, "error", String(e))
      rows = [latest[code]]
    }

    const existing = {}
    for (const r of app.findRecordsByFilter("river_levels", "post = {:post}", "-date", 60, 0, { post: post.id })) {
      existing[r.getDateTime("date").string()] = r
    }

    app.runInTransaction((txApp) => {
      for (const row of rows) {
        const level = num(row.ur8)
        if (!row.DateTime || level === null) continue
        const date = pbDate(row.DateTime)
        const values = {
          level,
          change: num(row.izur) ?? 0,
          ice: row.ledov || "",
          ice_thickness: num(row.tol_led) ?? 0,
          state: row.sosvo || "",
        }
        let record = existing[date]
        if (record && Object.entries(values).every(([k, v]) => record.get(k) === v)) continue
        if (!record) {
          record = new Record(collection)
          record.set("post", post.id)
          record.set("date", date)
        }
        record.load(values)
        txApp.save(record)
        saved++
      }
    })
  }
  return { markers: total, posts: posts.length, saved, failed }
}

module.exports = { fetchLevels, SOURCE_TITLE }
