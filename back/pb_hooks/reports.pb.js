/// <reference path="../pb_data/types.d.ts" />
// Гражданские обращения (CLAUDE.md §4 M3/M6, §8): кто какие поля меняет, допустимые переходы статусов,
// район по полигонам districts и история статусов в report_events.
// API rules пускают к записи (кто вообще может создать/изменить), хуки решают, что именно можно изменить.

onRecordCreateRequest((e) => {
  const lib = require(`${__hooks}/lib/reports.js`)
  const role = lib.role(e)
  const r = e.record

  if (role !== "superuser") {
    // Автор и стартовый статус — только от сервера; служебные поля из запроса пользователя игнорируются.
    // Аноним (вход по желанию) — без автора; его обращение открывается по access_key, который придумал браузер
    r.set("author", e.auth ? e.auth.id : "")
    if (e.auth) r.set("access_key", "")
    else {
      // Скрытое поле PocketBase вырезает из тела запроса — ключ приходит заголовком X-Report-Key
      const sent = String(e.request.header.get("X-Report-Key") || "")
      r.set("access_key", /^[A-Za-z0-9_-]{16,64}$/.test(sent) ? sent : $security.randomString(32))
    }
    r.set("status", "new")
    for (const f of ["moderator_comment", "ai_category", "ai_confidence", "duplicate_of"]) r.set(f, null)
  } else if (!r.getString("status")) {
    r.set("status", "new")
  }
  lib.assignDistrict(e.app, r)

  // Автопроверка: мат (с обходами) — сразу отказ с ошибкой у описания; правдоподобность — подсказка модератору
  const check = require(`${__hooks}/lib/autocheck.js`)
  if (check.findProfanity(r.getString("description")).length) {
    throw new BadRequestError("Уберите, пожалуйста, нецензурные слова.", {
      description: new ValidationError("validation_profanity", "Без нецензурных слов, пожалуйста — обращение увидят все"),
    })
  }
  const location = r.get("location") || {}
  const result = check.score(e.app, {
    id: r.id,
    category: r.getString("category"),
    description: r.getString("description"),
    // Загружаемые сейчас файлы ещё не имена — считаем их отдельно
    photos: r.getUnsavedFiles("photos").length || r.getStringSlice("photos").length,
    lat: location.lat,
    lon: location.lon,
    authorId: r.getString("author"),
  })
  r.set("auto_check", result)
  r.set("ai_confidence", result.score / 100) // поле — доля 0–1

  e.app.runInTransaction((txApp) => {
    e.app = txApp
    e.next()
    lib.writeEvent(txApp, r, "", role, e.auth, "")
  })
}, "reports")

// Автопроверку видят только модераторы и админы
onRecordEnrich((e) => {
  const auth = e.requestInfo && e.requestInfo.auth
  const staff = auth && auth.collection().name === "users" && ["moderator", "admin"].includes(auth.getString("role"))
  if (!staff && !(e.requestInfo && e.requestInfo.auth && e.requestInfo.auth.isSuperuser())) {
    e.record.hide("auto_check", "ai_confidence", "ai_category")
  }
  e.next()
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
    lib.assignDistrict(e.app, r)
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

// Обращение по личной ссылке анонима: /api/eco/reports/{id}?key=… — само обращение (без скрытых полей),
// название района и история статусов. Чужой или неверный ключ — 404, как будто обращения нет.
routerAdd("GET", "/api/eco/reports/{id}", (e) => {
  const id = e.request.pathValue("id")
  const key = e.request.url.query().get("key")
  let report
  try {
    report = e.app.findRecordById("reports", id)
  } catch (_) {
    throw new NotFoundError("Обращение не найдено.")
  }
  const stored = report.getString("access_key")
  if (!key || !stored || key !== stored) throw new NotFoundError("Обращение не найдено.")
  const districtId = report.getString("district")
  const district = districtId ? e.app.findRecordById("districts", districtId).getString("name") : ""
  const events = e.app.findRecordsByFilter("report_events", "report = {:id}", "created", 0, 0, { id })
  return e.json(200, { report, district, events })
})
