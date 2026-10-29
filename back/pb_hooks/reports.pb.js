/// <reference path="../pb_data/types.d.ts" />
// Гражданские обращения (CLAUDE.md §4 M3/M6, §8): кто какие поля меняет, допустимые переходы статусов,
// район по координатам и история статусов в report_events.
// API rules пускают к записи (кто вообще может создать/изменить), хуки решают, что именно можно изменить.

onRecordCreateRequest((e) => {
  const lib = require(`${__hooks}/lib/reports.js`)
  const role = lib.role(e)
  const r = e.record

  if (role !== "superuser") {
    // Автор и стартовый статус — только от сервера; служебные поля из запроса пользователя игнорируются
    r.set("author", e.auth.id)
    r.set("status", "new")
    for (const f of ["moderator_comment", "ai_category", "ai_confidence", "duplicate_of"]) r.set(f, null)
    lib.assertInOblast(r)
  } else if (!r.getString("status")) {
    r.set("status", "new")
  }
  r.set("district", lib.nearestDistrictId(e.app, r.get("location")))

  e.app.runInTransaction((txApp) => {
    e.app = txApp
    e.next()
    lib.writeEvent(txApp, r, "", role, e.auth, "")
  })
}, "reports")

onRecordUpdateRequest((e) => {
  const lib = require(`${__hooks}/lib/reports.js`)
  const role = lib.role(e)
  const r = e.record
  const fromStatus = r.original().getString("status")
  const toStatus = r.getString("status")

  if (role === "moderator") {
    lib.assertOnlyFields(e, lib.MODERATOR_FIELDS)
    if (toStatus !== fromStatus && !lib.TRANSITIONS[fromStatus].includes(toStatus)) {
      throw new BadRequestError(`Недопустимый переход статуса: ${fromStatus} → ${toStatus}.`)
    }
  } else if (role !== "admin" && role !== "superuser") {
    // API rule уже ограничил автора его же обращением в статусе new
    lib.assertOnlyFields(e, lib.AUTHOR_FIELDS)
  }
  if (r.getString("duplicate_of") === r.id) {
    throw new BadRequestError("Обращение не может быть дублем самого себя.")
  }
  if (lib.bodyFields(e).includes("location")) {
    r.set("district", lib.nearestDistrictId(e.app, r.get("location")))
  }

  e.app.runInTransaction((txApp) => {
    e.app = txApp
    e.next()
    if (toStatus !== fromStatus) {
      const comment = lib.bodyFields(e).includes("moderator_comment") ? r.getString("moderator_comment") : ""
      lib.writeEvent(txApp, r, fromStatus, role, e.auth, comment)
    }
  })
}, "reports")
