/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
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
        "help": "",
        "hidden": false,
        "id": "select4125321003",
        "maxSelect": 1,
        "name": "river",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "Сож",
          "Припять",
          "Днепр",
          "Березина"
        ]
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text1519021197",
        "max": 200,
        "min": 0,
        "name": "post",
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
        "id": "select3509886387",
        "maxSelect": 1,
        "name": "indicator",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "turbidity",
          "nitrates",
          "bod5",
          "ph",
          "hardness"
        ]
      },
      {
        "help": "",
        "hidden": false,
        "id": "number494360628",
        "max": null,
        "min": null,
        "name": "value",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text3703245907",
        "max": 40,
        "min": 0,
        "name": "unit",
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
        "id": "number2537346464",
        "max": null,
        "min": null,
        "name": "norm",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "help": "",
        "hidden": false,
        "id": "date3317178062",
        "max": "",
        "min": "",
        "name": "period",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_1124997656",
        "help": "",
        "hidden": false,
        "id": "relation1602912115",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "source",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
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
    "id": "pbc_2352559717",
    "indexes": [],
    "listRule": "",
    "name": "water_readings",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": ""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2352559717");

  return app.delete(collection);
})
