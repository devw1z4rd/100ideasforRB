/// <reference path="../pb_data/types.d.ts" />
// Качество воздуха (CLAUDE.md §4 M2, §8): Open-Meteo → air_readings → air_daily.
// Расписание cron в PocketBase — UTC. Запустить вручную: админка → Settings → Crons.

// Каждый час в :05 — сутки назад (уточнённые модельные значения) и прогноз на 5 дней
cronAdd("air_fetch", "5 * * * *", () => {
  const air = require(`${__hooks}/lib/air.js`)
  const r = air.fetchReadings($app, 1, 5)
  $app.logger().info("air_fetch", "points", r.points, "saved", r.saved, "skipped", r.skipped)
})

// 00:20 по Минску: свернуть вчера и позавчера в air_daily, удалить почасовые старше 90 дней
cronAdd("air_daily", "20 21 * * *", () => {
  const air = require(`${__hooks}/lib/air.js`)
  const r = air.rollupDaily($app, air.minskDay(-2), air.minskDay(0))
  const pruned = air.pruneHourly($app)
  $app.logger().info("air_daily", "days", r.days, "rows", r.rows, "pruned", pruned)
})

// Первичное наполнение после деплоя: `pocketbase air-backfill` — 90 дней истории, прогноз и air_daily за них
$app.rootCmd.addCommand(
  new Command({
    use: "air-backfill",
    short: "Загрузить историю воздуха за 90 дней и посчитать air_daily",
    run: () => {
      const air = require(`${__hooks}/lib/air.js`)
      const f = air.fetchReadings($app, air.KEEP_HOURLY_DAYS, 5)
      const d = air.rollupDaily($app, air.minskDay(-air.KEEP_HOURLY_DAYS), air.minskDay(0))
      console.log(`air-backfill: points ${f.points}, saved ${f.saved}, skipped ${f.skipped}; air_daily ${d.rows} за ${d.days} дн.`)
    },
  }),
)
