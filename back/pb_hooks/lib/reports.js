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

// Район — полигон, в который попала точка; вне всех районов — значит, вне области
function assignDistrict(app, record) {
  const district = require(`${__hooks}/lib/geo.js`).districtAt(app, record.get("location"))
  if (!district) {
    throw new BadRequestError("Точка обращения должна быть в Гомельской области.", {
      location: new ValidationError("outside_oblast", "Точка вне Гомельской области."),
    })
  }
  record.set("district", district)
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
  assignDistrict,
  writeEvent,
}
