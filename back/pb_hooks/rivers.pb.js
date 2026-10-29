/// <reference path="../pb_data/types.d.ts" />
// Уровни воды в реках (CLAUDE.md §8, §9): pogoda.by (Белгидромет) → river_posts, river_levels.
// Расписание cron в PocketBase — UTC. Запустить вручную: админка → Settings → Crons или `pocketbase river-fetch`.

// Белгидромет выкладывает уровни на 8:00 около 9:00 по Минску; второй запуск — если утром сайт не ответил
cronAdd("river_fetch", "40 6,14 * * *", () => {
  const rivers = require(`${__hooks}/lib/rivers.js`)
  const r = rivers.fetchLevels($app)
  $app.logger().info("river_fetch", "markers", r.markers, "posts", r.posts, "saved", r.saved, "failed", r.failed)
})

// Первичное наполнение после деплоя: посты области и уровни за последние 30 дней
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
