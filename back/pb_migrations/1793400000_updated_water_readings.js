/// <reference path="../pb_data/types.d.ts" />
// Малые реки Гомельской области из квартальных обзоров Белгидромета 2026 г.: Ведрич (дефицит кислорода у Бабичей)
// и Добысна (железо у Малевичской Рудни). В rivers.geojson их нет — точки на карте у этих записей нет.
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
