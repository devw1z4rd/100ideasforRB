/// <reference path="../pb_data/types.d.ts" />
// Data freshness for an external uptime monitor: 503 when a scheduled job has stopped delivering, so the
// monitor alerts even while the server itself is up.
//   air — air_fetch runs hourly at :05, so 3 h means two or three missed runs in a row;
//   rivers — levels are for 08:00 Minsk and arrive with the 06:40 UTC run, so the newest is normally under
//   26 h old; 48 h means a whole day without new levels.

routerAdd("GET", "/api/eco/health", (e) => {
  const HOUR = 3600000;
  const now = Date.now();
  const check = (collection, field, filter, limitHours) => {
    const [last] = e.app.findRecordsByFilter(collection, filter, `-${field}`, 1, 0);
    const at = last ? last.getDateTime(field).unix() * 1000 : 0;
    return {
      at: at ? new Date(at).toISOString() : null,
      ageHours: at ? Math.round(((now - at) / HOUR) * 10) / 10 : null,
      limitHours,
      ok: at > 0 && now - at <= limitHours * HOUR,
    };
  };
  const air = check("air_readings", "ts", "is_forecast = false", 3);
  const rivers = check("river_levels", "date", "id != ''", 48);
  const ok = air.ok && rivers.ok;
  return e.json(ok ? 200 : 503, { ok, air, rivers });
});
