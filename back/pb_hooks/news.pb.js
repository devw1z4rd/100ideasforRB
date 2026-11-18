/// <reference path="../pb_data/types.d.ts" />

cronAdd("hydro_news", "15 9,15 * * *", () => {
  const news = require(`${__hooks}/lib/hydroNews.js`)
  const r = news.importReviews($app)
  $app.logger().info("hydro_news", "found", r.found, "added", r.added, "failed", r.failed)
})

$app.rootCmd.addCommand(
  new Command({
    use: "hydro-news [url...]",
    short: "Загрузить обзоры гидрологической обстановки Белгидромета в новости",
    run: (cmd, args) => {
      const news = require(`${__hooks}/lib/hydroNews.js`)
      const r = news.importReviews($app, args.map(news.toPath))
      console.log(`hydro-news: обзоров ${r.found}, добавлено ${r.added}, с ошибкой ${r.failed}`)
    },
  }),
)

// A published item without published_at gets the current time, otherwise it sorts to the end of the feed.
onRecordCreate((e) => {
  if (e.record.getBool("is_published") && !e.record.getString("published_at"))
    e.record.set("published_at", new Date().toISOString())
  e.next()
}, "news")

onRecordUpdate((e) => {
  if (e.record.getBool("is_published") && !e.record.getString("published_at"))
    e.record.set("published_at", new Date().toISOString())
  e.next()
}, "news")
