/// <reference path="../pb_data/types.d.ts" />
// Production settings that used to be manual steps in the admin UI.
//
// Trusted proxy: behind Caddy every request comes from Caddy's IP, so without this the per-IP rate limits
// (guest reports, /api/) become one limit for the whole site. Caddy overwrites X-Forwarded-For from clients,
// so its value is the real client IP. PocketBase must listen on localhost only: if clients can reach it
// directly, they can set the header themselves and dodge the limits.
//
// Backups: daily at 02:30 Minsk, clear of the hourly air_fetch at :05; 7 kept in pb_data/backups. Copying
// them off the server is still a separate step.
migrate(
  (app) => {
    const settings = app.settings()
    settings.trustedProxy.headers = ["X-Forwarded-For"]
    settings.trustedProxy.useLeftmostIP = false
    settings.backups.cron = "30 23 * * *"
    settings.backups.cronMaxKeep = 7
    app.save(settings)
  },
  (app) => {
    const settings = app.settings()
    settings.trustedProxy.headers = []
    settings.backups.cron = ""
    settings.backups.cronMaxKeep = 3
    app.save(settings)
  },
)
