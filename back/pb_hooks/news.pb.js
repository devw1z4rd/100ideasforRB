/// <reference path="../pb_data/types.d.ts" />
// Новости (CLAUDE.md §4 S4, §8): свои новости — через админку; обзоры гидрологической обстановки Белгидромета —
// автоматически. Расписание cron в PocketBase — UTC.

// Обзоры выходят днём; второй запуск — если сайт не ответил
cronAdd("hydro_news", "15 9,15 * * *", () => {
  const news = require(`${__hooks}/lib/hydroNews.js`)
  const r = news.importReviews($app)
  $app.logger().info("hydro_news", "found", r.found, "added", r.added, "failed", r.failed)
})

// `pocketbase hydro-news` — последние обзоры со страницы раздела; `pocketbase hydro-news <url> …` — конкретные обзоры
// (например, архив за сезон)
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

// Опубликованная новость без даты получает дату публикации — иначе в ленте (сортировка по published_at) она уйдёт в конец
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
