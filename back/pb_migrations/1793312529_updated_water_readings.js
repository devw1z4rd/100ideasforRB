/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2352559717")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX idx_water_readings_quarter ON water_readings (quarter)"
    ]
  }, collection)

  // add field
  collection.fields.addAt(3, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text762542831",
    "max": 80,
    "min": 0,
    "name": "section",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "help": "",
    "hidden": false,
    "id": "geoPoint1587448267",
    "name": "location",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "geoPoint"
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "help": "",
    "hidden": false,
    "id": "select2737303846",
    "maxSelect": 1,
    "name": "norm_type",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "max",
      "min"
    ]
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text478273799",
    "max": 10,
    "min": 0,
    "name": "quarter",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(12, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text3485334036",
    "max": 500,
    "min": 0,
    "name": "note",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // update field
  collection.fields.addAt(1, new Field({
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
      "Березина",
      "Беседь",
      "Уборть",
      "Птичь",
      "Ипуть"
    ]
  }))

  // update field
  collection.fields.addAt(5, new Field({
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
      "hardness",
      "oxygen",
      "cod",
      "ammonium",
      "nitrite",
      "phosphate",
      "phosphorus",
      "chromium",
      "iron",
      "manganese",
      "copper",
      "zinc",
      "oil",
      "temperature",
      "hydrology"
    ]
  }))

  // update field
  collection.fields.addAt(6, new Field({
    "help": "",
    "hidden": false,
    "id": "number494360628",
    "max": null,
    "min": null,
    "name": "value",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2352559717")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  // remove field
  collection.fields.removeById("text762542831")

  // remove field
  collection.fields.removeById("geoPoint1587448267")

  // remove field
  collection.fields.removeById("select2737303846")

  // remove field
  collection.fields.removeById("text478273799")

  // remove field
  collection.fields.removeById("text3485334036")

  // update field
  collection.fields.addAt(1, new Field({
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
  }))

  // update field
  collection.fields.addAt(3, new Field({
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
  }))

  // update field
  collection.fields.addAt(4, new Field({
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
  }))

  return app.save(collection)
})
