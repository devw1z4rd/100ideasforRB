/// <reference path="../pb_data/types.d.ts" />
// `pocketbase seed` from back/. Idempotent: records are matched by natural key and updated; extra records are
// not deleted.

$app.rootCmd.addCommand(
  new Command({
    use: "seed",
    short: "Загрузить справочники из back/seed",
    run: () => {
      // Custom commands don't apply pb_migrations — run `pocketbase migrate up` first.
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

        const water = read("water_readings.json")
        for (const src of water.sources) sourceIds[src.title] = upsert(txApp, "sources", "title", src.title, src).id
        const waterCollection = txApp.findCollectionByNameOrId("water_readings")
        for (const r of water.readings) {
          if (!sourceIds[r.source]) throw new Error(`water_readings.json: неизвестный источник «${r.source}»`)
          let record
          try {
            record = txApp.findFirstRecordByFilter(
              "water_readings",
              "quarter = {:quarter} && river = {:river} && post = {:post} && indicator = {:indicator} && period = {:period}",
              r,
            )
          } catch {
            record = new Record(waterCollection)
          }
          record.load({ ...r, source: sourceIds[r.source] })
          txApp.save(record)
        }

        const articles = read("articles.json")
        const articlesCollection = txApp.findCollectionByNameOrId("articles")
        let articlesAdded = 0
        for (const a of articles) {
          try {
            txApp.findFirstRecordByData("articles", "slug", a.slug)
            continue
          } catch {}
          const record = new Record(articlesCollection)
          record.load({ ...a, is_published: true })
          txApp.save(record)
          articlesAdded++
        }

        console.log(
          `seed: sources ${sources.length + water.sources.length}, districts ${districts.length}, air_points ${points.length}, ` +
            `emission_stats ${stats.length}, water_readings ${water.readings.length}, articles +${articlesAdded} из ${articles.length}`,
        )
      })
    },
  }),
)
