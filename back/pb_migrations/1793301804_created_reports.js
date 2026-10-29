/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id != \"\" && @request.auth.collectionName = \"users\"",
    "deleteRule": "@request.auth.role = \"admin\"",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "help": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "help": "",
        "hidden": false,
        "id": "relation3182418120",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "author",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "help": "",
        "hidden": false,
        "id": "geoPoint1587448267",
        "name": "location",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "geoPoint"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_214498884",
        "help": "",
        "hidden": false,
        "id": "relation834753671",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "district",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select105650625",
        "maxSelect": 1,
        "name": "category",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "dump",
          "discharge",
          "smoke",
          "felling",
          "burning",
          "other"
        ]
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text1843675174",
        "max": 1000,
        "min": 0,
        "name": "description",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
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
      },
      {
        "help": "",
        "hidden": false,
        "id": "select2063623452",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "new",
          "accepted",
          "forwarded",
          "resolved",
          "rejected"
        ]
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text2199928535",
        "max": 1000,
        "min": 0,
        "name": "moderator_comment",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text430612385",
        "max": 40,
        "min": 0,
        "name": "ai_category",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number1750188997",
        "max": 1,
        "min": 0,
        "name": "ai_confidence",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_1615648943",
    "indexes": [
      "CREATE INDEX idx_reports_status ON reports (status)",
      "CREATE INDEX idx_reports_author ON reports (author)",
      "CREATE INDEX idx_reports_district ON reports (district)"
    ],
    "listRule": "(status != \"new\" && status != \"rejected\") || author = @request.auth.id || @request.auth.role = \"moderator\" || @request.auth.role = \"admin\"",
    "name": "reports",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.role = \"moderator\" || @request.auth.role = \"admin\" || (author = @request.auth.id && status = \"new\")",
    "viewRule": "(status != \"new\" && status != \"rejected\") || author = @request.auth.id || @request.auth.role = \"moderator\" || @request.auth.role = \"admin\""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1615648943");

  return app.delete(collection);
})
