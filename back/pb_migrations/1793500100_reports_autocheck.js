/// <reference path="../pb_data/types.d.ts" />
// Автопроверка обращения (CLAUDE.md §10.15): { score: 5–95, reasons: [{ delta, text }] } — подсказка модератору.
// Пишет хук при создании (back/pb_hooks/reports.pb.js); не модераторам поле скрывает onRecordEnrich.
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
