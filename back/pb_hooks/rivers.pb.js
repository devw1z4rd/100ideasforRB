/// <reference path="../pb_data/types.d.ts" />

cronAdd("river_fetch", "40 6,14 * * *", () => {
  const rivers = require(`${__hooks}/lib/rivers.js`)
  const r = rivers.fetchLevels($app)
  $app.logger().info("river_fetch", "markers", r.markers, "posts", r.posts, "saved", r.saved, "failed", r.failed)
})

$app.rootCmd.addCommand(
  new Command({
    use: "river-fetch",
    short: "Загрузить посты и уровни воды за 30 дней с pogoda.by",
    run: () => {
      const rivers = require(`${__hooks}/lib/rivers.js`)
      const r = rivers.fetchLevels($app)
      console.log(`river-fetch: постов в области ${r.posts} из ${r.markers}, сохранено ${r.saved}, не ответили ${r.failed}`)
    },
  }),
)
