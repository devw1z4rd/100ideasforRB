/// <reference path="../pb_data/types.d.ts" />
// API rules decide who may write; these hooks decide which fields each role may change, valid status
// transitions, the district and the report_events history.

onRecordCreateRequest((e) => {
  const lib = require(`${__hooks}/lib/reports.js`)
  const role = lib.role(e)
  const r = e.record

  if (role !== "superuser") {
    // Author and initial status come only from the server. Anonymous reports have no author and are opened
    // via the browser-generated access_key.
    r.set("author", e.auth ? e.auth.id : "")
    if (e.auth) r.set("access_key", "")
    else {
      // PocketBase strips hidden fields from the request body, so the key arrives in the X-Report-Key header.
      // Read via requestInfo(): e.request is undefined in record request hooks on PocketBase 0.42.
      const sent = String(e.requestInfo().headers["x_report_key"] || "")
      r.set("access_key", /^[A-Za-z0-9_-]{16,64}$/.test(sent) ? sent : $security.randomString(32))
    }
    r.set("status", "new")
    for (const f of ["moderator_comment", "ai_category", "ai_confidence", "duplicate_of"]) r.set(f, null)
  } else if (!r.getString("status")) {
    r.set("status", "new")
  }
  lib.assignDistrict(e.app, r)

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
    // Files being uploaded aren't names yet — count them separately.
    photos: r.getUnsavedFiles("photos").length || r.getStringSlice("photos").length,
    lat: location.lat,
    lon: location.lon,
    authorId: r.getString("author"),
  })
  r.set("auto_check", result)
  r.set("ai_confidence", result.score / 100)

  e.app.runInTransaction((txApp) => {
    e.app = txApp
    e.next()
    lib.writeEvent(txApp, r, "", role, e.auth, "")
  })
}, "reports")

// Only moderators and admins see the auto-check.
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
    // The API rule already limits the author to their own report in status new.
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

// Anonymous personal link /api/eco/reports/{id}?key=…; a wrong key returns 404, as if there were no report.
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
