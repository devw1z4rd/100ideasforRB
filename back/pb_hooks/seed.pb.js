/// <reference path="../pb_data/types.d.ts" />
// Справочники из back/seed (CLAUDE.md §7): `pocketbase seed` (или `pocketbase.exe seed`) из папки back/.
// Идемпотентно: записи ищутся по естественному ключу и обновляются, лишние не удаляются.
//   sources.json      → sources      (ключ title)
//   districts.geojson → districts    (ключ name; center и geometry из GeoJSON)
//   air_points.json   → air_points   (ключ name; district — по названию района)
//   emission_stats.json → emission_stats (ключ территория + год + показатель + вещество; source — по названию источника)

$app.rootCmd.addCommand(
  new Command({
    use: "seed",
    short: "Загрузить справочники из back/seed",
    run: () => {
      // Свои команды не применяют миграции из pb_migrations — это делают serve и migrate up
      try {
        $app.findCollectionByNameOrId("emission_stats")
      } catch {
        throw new Error("Коллекций нет: сначала `pocketbase migrate up`")
      }
      const dir = `${__hooks}/../seed`
      const read = (name) => JSON.parse(toString($os.readFile(`${dir}/${name}`)))

      const upsert = (txApp, collection, field, value, data) => {
        let record
        try {
          record = txApp.findFirstRecordByData(collection, field, value)
        } catch {
          record = new Record(txApp.findCollectionByNameOrId(collection))
        }
        record.load(data)
        txApp.save(record)
        return record
      }

      $app.runInTransaction((txApp) => {
        const sources = read("sources.json")
        const sourceIds = {}
        for (const s of sources) sourceIds[s.title] = upsert(txApp, "sources", "title", s.title, s).id

        const districtIds = {}
        const districts = read("districts.geojson").features
        for (const f of districts) {
          const p = f.properties
          const record = upsert(txApp, "districts", "name", p.name, {
            name: p.name,
            name_be: p.name_be,
            center: p.center,
            geometry: f.geometry,
          })
          districtIds[p.name] = record.id
        }

        const points = read("air_points.json")
        for (const p of points) {
          if (!districtIds[p.district]) throw new Error(`air_points.json: неизвестный район «${p.district}» у «${p.name}»`)
          upsert(txApp, "air_points", "name", p.name, { ...p, district: districtIds[p.district] })
        }

        const stats = read("emission_stats.json")
        const statsCollection = txApp.findCollectionByNameOrId("emission_stats")
        for (const r of stats) {
          if (!sourceIds[r.source]) throw new Error(`emission_stats.json: неизвестный источник «${r.source}»`)
          let record
          try {
            record = txApp.findFirstRecordByFilter(
              "emission_stats",
              "territory = {:territory} && year = {:year} && indicator = {:indicator} && pollutant = {:pollutant}",
              r,
            )
          } catch {
            record = new Record(statsCollection)
          }
          record.load({ ...r, source: sourceIds[r.source] })
          txApp.save(record)
        }

        console.log(
          `seed: sources ${sources.length}, districts ${districts.length}, air_points ${points.length}, emission_stats ${stats.length}`,
        )
      })
    },
  }),
)
