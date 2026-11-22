/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2470494116")

  // update collection data
  unmarshal({
    "listRule": "(report.status != \"new\" && report.status != \"rejected\" && report.duplicate_of = \"\") || (@request.auth.id != \"\" && report.author = @request.auth.id) || @request.auth.role = \"moderator\" || @request.auth.role = \"admin\"",
    "viewRule": "(report.status != \"new\" && report.status != \"rejected\" && report.duplicate_of = \"\") || (@request.auth.id != \"\" && report.author = @request.auth.id) || @request.auth.role = \"moderator\" || @request.auth.role = \"admin\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2470494116")

  // update collection data
  unmarshal({
    "listRule": "(report.status != \"new\" && report.status != \"rejected\") || (@request.auth.id != \"\" && report.author = @request.auth.id) || @request.auth.role = \"moderator\" || @request.auth.role = \"admin\"",
    "viewRule": "(report.status != \"new\" && report.status != \"rejected\") || (@request.auth.id != \"\" && report.author = @request.auth.id) || @request.auth.role = \"moderator\" || @request.auth.role = \"admin\""
  }, collection)

  return app.save(collection)
})
