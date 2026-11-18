/// <reference path="../pb_data/types.d.ts" />
// Anonymous reports: anyone can submit; access_key is a hidden field (never returned by the API) used by
// /api/eco/reports/{id}?key=…. `author = @request.auth.id` applies only to signed-in users: an anonymous
// report has an empty author and an anonymous visitor an empty id, so without the check anyone could read and
// edit other people's anonymous reports.
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
