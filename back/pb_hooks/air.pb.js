/// <reference path="../pb_data/types.d.ts" />
// PocketBase cron schedules are in UTC.

cronAdd("air_fetch", "5 * * * *", () => {
  const air = require(`${__hooks}/lib/air.js`);
  const r = air.fetchLatest($app);
  $app
    .logger()
    .info(
      "air_fetch",
      "since",
      r.since || "",
      "saved",
      r.saved,
      "skipped",
      r.skipped,
      "daily_filled",
      (r.dailyFilled || []).join(","),
    );
});

cronAdd("air_daily", "20 21 * * *", () => {
  const air = require(`${__hooks}/lib/air.js`);
  const r = air.rollupDaily($app, air.minskDay(-2), air.minskDay(0));
  const pruned = air.pruneHourly($app);
  $app
    .logger()
    .info("air_daily", "days", r.days, "rows", r.rows, "pruned", pruned);
});

$app.rootCmd.addCommand(
  new Command({
    use: "air-backfill [since]",
    short: "Загрузить историю воздуха с даты и посчитать air_daily",
    run: (cmd, args) => {
      const air = require(`${__hooks}/lib/air.js`);
      const since = args[0] || air.minskDay(-air.KEEP_HOURLY_DAYS);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(since))
        throw new Error("Дата в формате YYYY-MM-DD");
      const r = air.backfill($app, since);
      console.log(
        `air-backfill с ${since}: saved ${r.saved}, skipped ${r.skipped}; air_daily ${r.rows} за ${r.days} дн.; удалено почасовых ${r.pruned}`,
      );
    },
  }),
);
