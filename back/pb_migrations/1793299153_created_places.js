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
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text1579384326",
        "max": 200,
        "min": 0,
        "name": "name",
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
        "id": "select1002749145",
        "maxSelect": 1,
        "name": "kind",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "problem",
          "clean",
          "oopt"
        ]
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
        "id": "geoPoint1587448267",
        "name": "location",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "geoPoint"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select4133540203",
        "maxSelect": 1,
        "name": "severity",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "high",
          "medium",
          "low"
        ]
      },
      {
        "help": "",
        "hidden": false,
        "id": "select1232732347",
        "maxSelect": 12,
        "name": "pollutants",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "PM2.5",
          "PM10",
          "NO2",
          "SO2",
          "VOC",
          "hydrocarbons",
          "radionuclides",
          "heavy_metals",
          "solid_waste",
          "phosphates",
          "dust",
          "noise"
        ]
      },
      {
        "help": "",
        "hidden": false,
        "id": "select989021800",
        "maxSelect": 6,
        "name": "categories",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "particles",
          "gases",
          "hydrocarbons",
          "radionuclides",
          "waste",
          "other"
        ]
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_1917259439",
        "help": "",
        "hidden": false,
        "id": "relation2981325315",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "enterprise",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text3485334036",
        "max": 1000,
        "min": 0,
        "name": "note",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
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
    "id": "pbc_3384545563",
    "indexes": [],
    "listRule": "",
    "name": "places",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": ""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3384545563");

  return app.delete(collection);
})
