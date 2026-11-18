/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const reports = app.findCollectionByNameOrId("reports")
    reports.fields.add(new JSONField({ name: "auto_check", maxSize: 4000 }))
    app.save(reports)
  },
  (app) => {
    const reports = app.findCollectionByNameOrId("reports")
    reports.fields.removeByName("auto_check")
    app.save(reports)
  },
)
