// Общая логика обращений для reports.pb.js.
// Обработчики PocketBase исполняются в изолированных контекстах и не видят переменных файла,
// поэтому всё общее подключается внутри обработчика: require(`${__hooks}/lib/reports.js`).

// Переходы статусов, доступные модератору (CLAUDE.md §4, M3). Админ и суперпользователь меняют статус свободно.
const TRANSITIONS = {
  new: ["accepted", "rejected"],
  accepted: ["forwarded", "resolved", "rejected"],
  forwarded: ["resolved", "rejected"],
  resolved: [],
  rejected: [],
}

// Поля, которые может прислать в запросе на изменение каждая роль
const AUTHOR_FIELDS = ["description"]
const MODERATOR_FIELDS = ["status", "moderator_comment", "duplicate_of"]

// Грубая рамка Гомельской области с запасом ~10 км. Точная проверка — по полигону области,
// когда границы (§9) появятся в back/seed.
const OBLAST_BBOX = { minLat: 51.2, maxLat: 53.4, minLon: 27.2, maxLon: 32.0 }

function role(e) {
  if (e.hasSuperuserAuth()) return "superuser"
  return (e.auth && e.auth.collection().name === "users" && e.auth.getString("role")) || ""
}

// Имена полей из тела запроса; модификаторы файлов и массивов (photos+, +photos, photos-) сводятся к имени поля
function bodyFields(e) {
  return Object.keys(e.requestInfo().body).map((key) => key.replace(/^\+|[+-]$/g, ""))
}

function assertOnlyFields(e, allowed) {
  const extra = bodyFields(e).filter((name) => !allowed.includes(name))
  if (extra.length) throw new ForbiddenError("Нельзя изменить поля: " + extra.join(", "))
}

function assertInOblast(record) {
  const p = record.get("location")
  const b = OBLAST_BBOX
  if (!(p.lat >= b.minLat && p.lat <= b.maxLat && p.lon >= b.minLon && p.lon <= b.maxLon)) {
    throw new BadRequestError("Точка обращения должна быть в Гомельской области.", {
      location: new ValidationError("outside_oblast", "Точка вне Гомельской области."),
    })
  }
}

// Ближайший райцентр по прямой. Приближение: у границ районов может ошибиться — заменить
// на попадание в полигон района, когда districts.geojson появится в back/seed.
function nearestDistrictId(app, point) {
  let bestId = ""
  let best = Infinity
  for (const d of app.findAllRecords("districts")) {
    const c = d.get("center")
    if (!c || (c.lat === 0 && c.lon === 0)) continue
    const dLat = c.lat - point.lat
    const dLon = (c.lon - point.lon) * Math.cos((point.lat * Math.PI) / 180)
    const dist = dLat * dLat + dLon * dLon
    if (dist < best) {
      best = dist
      bestId = d.id
    }
  }
  return bestId
}

function writeEvent(app, report, fromStatus, actorRole, auth, comment) {
  const event = new Record(app.findCollectionByNameOrId("report_events"))
  event.set("report", report.id)
  event.set("from_status", fromStatus)
  event.set("to_status", report.getString("status"))
  // Действия суперпользователя из админки пишутся без автора
  if (actorRole !== "superuser" && auth) event.set("actor", auth.id)
  event.set("comment", comment)
  app.save(event)
}

module.exports = {
  TRANSITIONS,
  AUTHOR_FIELDS,
  MODERATOR_FIELDS,
  role,
  bodyFields,
  assertOnlyFields,
  assertInOblast,
  nearestDistrictId,
  writeEvent,
}
