/// <reference path="../pb_data/types.d.ts" />
// Качество воздуха (CLAUDE.md §4 M2, §8): Open-Meteo → air_readings → air_daily.
// Расписание cron в PocketBase — UTC. Запустить вручную: админка → Settings → Crons.

// Каждый час в :05 — сутки назад (уточнённые модельные значения) и прогноз на 5 дней
cronAdd("air_fetch", "5 * * * *", () => {
  const air = require(`${__hooks}/lib/air.js`)
  const r = air.fetchReadings($app, "past_days=1&forecast_days=5")
  $app.logger().info("air_fetch", "points", r.points, "saved", r.saved, "skipped", r.skipped)
})

// 00:20 по Минску: свернуть вчера и позавчера в air_daily, удалить почасовые старше 90 дней
cronAdd("air_daily", "20 21 * * *", () => {
  const air = require(`${__hooks}/lib/air.js`)
  const r = air.rollupDaily($app, air.minskDay(-2), air.minskDay(0))
  const pruned = air.pruneHourly($app)
  $app.logger().info("air_daily", "days", r.days, "rows", r.rows, "pruned", pruned)
})

// Первичное наполнение после деплоя: `pocketbase air-backfill [YYYY-MM-DD]` — история с даты (по умолчанию 90 дней),
// прогноз и air_daily за период. Для «с начала года» на главной: `pocketbase air-backfill 2026-01-01`.
$app.rootCmd.addCommand(
  new Command({
    use: "air-backfill [since]",
    short: "Загрузить историю воздуха с даты и посчитать air_daily",
    run: (cmd, args) => {
      const air = require(`${__hooks}/lib/air.js`)
      const since = args[0] || air.minskDay(-air.KEEP_HOURLY_DAYS)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) throw new Error("Дата в формате YYYY-MM-DD")
      const r = air.backfill($app, since)
      console.log(`air-backfill с ${since}: saved ${r.saved}, skipped ${r.skipped}; air_daily ${r.rows} за ${r.days} дн.; удалено почасовых ${r.pruned}`)
    },
  }),
)
