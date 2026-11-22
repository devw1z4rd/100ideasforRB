/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1615648943")

  // update collection data
  unmarshal({
    "listRule": "(status != \"new\" && status != \"rejected\" && duplicate_of = \"\") || (@request.auth.id != \"\" && author = @request.auth.id) || @request.auth.role = \"moderator\" || @request.auth.role = \"admin\"",
    "viewRule": "((status != \"new\" && status != \"rejected\" && duplicate_of = \"\") || (@request.auth.id != \"\" && author = @request.auth.id) || @request.auth.role = \"moderator\" || @request.auth.role = \"admin\") || (@request.context = \"protectedFile\" && access_key != \"\" && access_key = @request.query.key)"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1615648943")

  // update collection data
  unmarshal({
    "listRule": "(status != \"new\" && status != \"rejected\") || (@request.auth.id != \"\" && author = @request.auth.id) || @request.auth.role = \"moderator\" || @request.auth.role = \"admin\"",
    "viewRule": "((status != \"new\" && status != \"rejected\") || (@request.auth.id != \"\" && author = @request.auth.id) || @request.auth.role = \"moderator\" || @request.auth.role = \"admin\") || (@request.context = \"protectedFile\" && access_key != \"\" && access_key = @request.query.key)"
  }, collection)

  return app.save(collection)
})
