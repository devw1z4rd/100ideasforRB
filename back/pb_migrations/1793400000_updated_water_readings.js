/// <reference path="../pb_data/types.d.ts" />
const base = ["Сож", "Припять", "Днепр", "Березина", "Беседь", "Уборть", "Птичь", "Ипуть"]

const riverField = (values) =>
  new Field({
    "help": "",
    "hidden": false,
    "id": "select4125321003",
    "maxSelect": 1,
    "name": "river",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": values,
  })

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("pbc_2352559717")
    collection.fields.addAt(1, riverField([...base, "Ведрич", "Добысна"]))
    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("pbc_2352559717")
    collection.fields.addAt(1, riverField(base))
    return app.save(collection)
  },
)
