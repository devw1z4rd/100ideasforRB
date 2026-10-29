/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "createRule": "(@request.body.role:isset = false || @request.body.role = \"user\") && @request.body.telegram_id:isset = false",
    "deleteRule": "@request.auth.role = \"admin\"",
    "indexes": [
      "CREATE UNIQUE INDEX `idx_tokenKey__pb_users_auth_` ON `users` (`tokenKey`)",
      "CREATE UNIQUE INDEX `idx_email__pb_users_auth_` ON `users` (`email`) WHERE `email` != ''",
      "CREATE UNIQUE INDEX idx_users_telegram_id ON users (telegram_id) WHERE telegram_id != ''"
    ],
    "listRule": "id = @request.auth.id || @request.auth.role = \"admin\"",
    "updateRule": "(id = @request.auth.id && @request.body.role:isset = false && @request.body.telegram_id:isset = false) || @request.auth.role = \"admin\"",
    "viewRule": "id = @request.auth.id || @request.auth.role = \"admin\""
  }, collection)

  // add field
  collection.fields.addAt(10, new Field({
    "help": "",
    "hidden": false,
    "id": "select1466534506",
    "maxSelect": 1,
    "name": "role",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "user",
      "moderator",
      "admin"
    ]
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text3423285350",
    "max": 32,
    "min": 0,
    "name": "telegram_id",
    "pattern": "^[0-9]*$",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(12, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_214498884",
    "help": "",
    "hidden": false,
    "id": "relation643093061",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "notify_district",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(13, new Field({
    "help": "",
    "hidden": false,
    "id": "number2830593875",
    "max": 500,
    "min": 0,
    "name": "notify_aqi_threshold",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "createRule": "",
    "deleteRule": "id = @request.auth.id",
    "indexes": [
      "CREATE UNIQUE INDEX `idx_tokenKey__pb_users_auth_` ON `users` (`tokenKey`)",
      "CREATE UNIQUE INDEX `idx_email__pb_users_auth_` ON `users` (`email`) WHERE `email` != ''"
    ],
    "listRule": "id = @request.auth.id",
    "updateRule": "id = @request.auth.id",
    "viewRule": "id = @request.auth.id"
  }, collection)

  // remove field
  collection.fields.removeById("select1466534506")

  // remove field
  collection.fields.removeById("text3423285350")

  // remove field
  collection.fields.removeById("relation643093061")

  // remove field
  collection.fields.removeById("number2830593875")

  return app.save(collection)
})
