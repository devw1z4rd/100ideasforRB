/// <reference path="../pb_data/types.d.ts" />
// PocketBase cron doesn't re-run missed jobs. On the first tick after `serve` starts, this job unschedules
// itself and catches up air, rivers and news once.

cronAdd("catch_up", "* * * * *", () => {
  $app.cron().remove("catch_up");
  const step = (name, fn) => {
    try {
      $app
        .logger()
        .info("catch_up", "step", name, "result", JSON.stringify(fn()));
    } catch (e) {
      $app.logger().warn("catch_up", "step", name, "error", String(e));
    }
  };
  step("air", () => require(`${__hooks}/lib/air.js`).fetchLatest($app));
  step("rivers", () => {
    const rivers = require(`${__hooks}/lib/rivers.js`);
    return rivers.hasLatest($app) ? "fresh" : rivers.fetchLevels($app);
  });
  step("news", () =>
    require(`${__hooks}/lib/hydroNews.js`).importReviews($app),
  );
});
