/// <reference path="../pb_data/types.d.ts" />
// Догон после простоя (CLAUDE.md §6): cron PocketBase не запускает пропущенные задачи, поэтому после выключенного
// сервера воздух, реки и новости стояли бы до следующего запуска по расписанию (новости — до 9:15 или 15:15 UTC).
// На первом тике после старта serve (до минуты) задача снимает себя с расписания и один раз проходит всё.

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
