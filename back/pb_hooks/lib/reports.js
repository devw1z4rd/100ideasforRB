// PocketBase handlers run in isolated contexts and don't see file-level variables, so shared code is required
// inside each handler: require(`${__hooks}/lib/reports.js`).

const TRANSITIONS = {
  new: ["accepted", "rejected"],
  accepted: ["forwarded", "resolved", "rejected"],
  forwarded: ["resolved", "rejected"],
  resolved: [],
  rejected: [],
}

const AUTHOR_FIELDS = ["description"]
const MODERATOR_FIELDS = ["status", "moderator_comment", "duplicate_of"]

function role(e) {
  if (e.hasSuperuserAuth()) return "superuser"
  return (e.auth && e.auth.collection().name === "users" && e.auth.getString("role")) || ""
}

function bodyFields(e) {
  return Object.keys(e.requestInfo().body).map((key) => key.replace(/^\+|[+-]$/g, ""))
}

function assertOnlyFields(e, allowed) {
  const extra = bodyFields(e).filter((name) => !allowed.includes(name))
  if (extra.length) throw new ForbiddenError("Нельзя изменить поля: " + extra.join(", "))
}

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
  if (actorRole !== "superuser" && auth) event.set("actor", auth.id)
  event.set("comment", comment)
  app.save(event)
}

function hasDuplicates(app, id) {
  return app.countRecords("reports", $dbx.hashExp({ duplicate_of: id })) > 0
}

function duplicateError(code, message) {
  return new BadRequestError(message, { duplicate_of: new ValidationError(code, message) })
}

function applyDuplicate(app, report) {
  const parentId = report.getString("duplicate_of")
  if (!parentId) {
    report.set("status", "new")
    report.set("moderator_comment", "")
    return "Связь с основным обращением снята. Обращение возвращено на проверку."
  }
  if (parentId === report.id) {
    throw duplicateError("duplicate_self", "Выберите другое обращение.")
  }
  if (hasDuplicates(app, report.id)) {
    throw duplicateError("duplicate_has_children", "Сначала отвяжите дубликаты этого обращения.")
  }
  let parent
  try {
    parent = app.findRecordById("reports", parentId)
  } catch (_) {
    throw duplicateError("duplicate_not_found", "Основное обращение не найдено.")
  }
  if (parent.getString("duplicate_of") || parent.getString("status") === "rejected") {
    throw duplicateError("duplicate_invalid_parent", "Выберите основное обращение без связи с другим и без статуса «Отклонено».")
  }
  report.set("status", parent.getString("status"))
  report.set("moderator_comment", parent.getString("moderator_comment"))
  return "Обращение связано с основным. Его статус будет обновляться вместе с основным."
}

function syncDuplicates(app, root, actorRole, auth, comment) {
  const children = app.findRecordsByFilter("reports", "duplicate_of = {:id}", "", 0, 0, { id: root.id })
  const status = root.getString("status")
  for (const child of children) {
    const previous = child.getString("status")
    if (previous === status) continue
    child.set("status", status)
    child.set("moderator_comment", comment)
    app.save(child)
    writeEvent(app, child, previous, actorRole, auth, comment)
  }
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
  hasDuplicates,
  duplicateError,
  applyDuplicate,
  syncDuplicates,
}
