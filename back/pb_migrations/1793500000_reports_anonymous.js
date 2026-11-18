/// <reference path="../pb_data/types.d.ts" />
// Анонимные обращения (CLAUDE.md §4 M3, §8): отправить может любой, вход — по желанию.
// - createRule открыт всем; автора ставит хук (у анонимного — пусто).
// - access_key — скрытое поле (в ответах API не отдаётся): ключ, который придумывает браузер анонима;
//   по нему обращение видно через /api/eco/reports/{id}?key=… (back/pb_hooks/reports.pb.js).
// - описание необязательно: на улице главное — фото, место и что случилось.
// - «author = @request.auth.id» теперь только для вошедших: у анонимного обращения автор пустой, у анонимного
//   посетителя id тоже пустой — без этой проверки любой видел и правил бы чужие анонимные обращения.
const own = '(@request.auth.id != "" && author = @request.auth.id)'
const ownEvent = '(@request.auth.id != "" && report.author = @request.auth.id)'
const staff = '@request.auth.role = "moderator" || @request.auth.role = "admin"'

migrate(
  (app) => {
    const reports = app.findCollectionByNameOrId("reports")
    reports.listRule = `(status != "new" && status != "rejected") || ${own} || ${staff}`
    reports.viewRule = reports.listRule
    reports.createRule = ""
    reports.updateRule = `${staff} || (${own} && status = "new")`
    reports.fields.getByName("author").required = false
    reports.fields.getByName("description").required = false
    reports.fields.add(
      new TextField({ name: "access_key", hidden: true, max: 64, pattern: "^[A-Za-z0-9_-]*$" }),
    )
    app.save(reports)

    const events = app.findCollectionByNameOrId("report_events")
    events.listRule = `(report.status != "new" && report.status != "rejected") || ${ownEvent} || ${staff}`
    events.viewRule = events.listRule
    app.save(events)

    // Защита от потока анонимных обращений: не больше 5 за 10 минут с одного IP (встроенный rate limiter;
    // вместе с ним включаются и стандартные правила PocketBase). Не вышло — миграция не падает, правило
    // можно добавить в админке: Settings → Rate limits
    try {
      const settings = app.settings()
      settings.rateLimits.enabled = true
      settings.rateLimits.rules = [
        ...settings.rateLimits.rules.filter((r) => r.label !== "reports:create"),
        { label: "reports:create", audience: "@guest", duration: 600, maxRequests: 5 },
      ]
      app.save(settings)
    } catch (err) {
      console.warn("reports_anonymous: rate limit not set:", err)
    }
  },
  (app) => {
    const reports = app.findCollectionByNameOrId("reports")
    reports.listRule = `(status != "new" && status != "rejected") || author = @request.auth.id || ${staff}`
    reports.viewRule = reports.listRule
    reports.createRule = '@request.auth.id != "" && @request.auth.collectionName = "users"'
    reports.updateRule = `${staff} || (author = @request.auth.id && status = "new")`
    reports.fields.getByName("author").required = true
    reports.fields.getByName("description").required = true
    reports.fields.removeByName("access_key")
    app.save(reports)

    const events = app.findCollectionByNameOrId("report_events")
    events.listRule = `(report.status != "new" && report.status != "rejected") || report.author = @request.auth.id || ${staff}`
    events.viewRule = events.listRule
    app.save(events)
  },
)
