/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1615648943")

  // update collection data
  unmarshal({
    "viewRule": "((status != \"new\" && status != \"rejected\") || (@request.auth.id != \"\" && author = @request.auth.id) || @request.auth.role = \"moderator\" || @request.auth.role = \"admin\") || (@request.context = \"protectedFile\" && access_key != \"\" && access_key = @request.query.key)"
  }, collection)

  // update field
  collection.fields.addAt(6, new Field({
    "help": "",
    "hidden": false,
    "id": "file142008537",
    "maxSelect": 5,
    "maxSize": 8388608,
    "mimeTypes": [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif"
    ],
    "name": "photos",
    "presentable": false,
    "protected": true,
    "required": false,
    "system": false,
    "thumbs": [
      "160x160",
      "640x0"
    ],
    "type": "file"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1615648943")

  // update collection data
  unmarshal({
    "viewRule": "(status != \"new\" && status != \"rejected\") || (@request.auth.id != \"\" && author = @request.auth.id) || @request.auth.role = \"moderator\" || @request.auth.role = \"admin\""
  }, collection)

  // update field
  collection.fields.addAt(6, new Field({
    "help": "",
    "hidden": false,
    "id": "file142008537",
    "maxSelect": 5,
    "maxSize": 8388608,
    "mimeTypes": [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif"
    ],
    "name": "photos",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": [
      "160x160",
      "640x0"
    ],
    "type": "file"
  }))

  return app.save(collection)
})
