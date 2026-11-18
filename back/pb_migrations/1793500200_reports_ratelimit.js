/// <reference path="../pb_data/types.d.ts" />
// Guest report limit: 10 per 10 minutes per IP (failed attempts count too). Behind Caddy, set Settings →
// Trusted proxy → X-Forwarded-For, otherwise all guests share one IP.
migrate(
  (app) => {
    const settings = app.settings()
    settings.rateLimits.rules = settings.rateLimits.rules.map((r) =>
      r.label === "reports:create" ? { label: r.label, audience: r.audience, duration: 600, maxRequests: 10 } : r,
    )
    app.save(settings)
  },
  (app) => {
    const settings = app.settings()
    settings.rateLimits.rules = settings.rateLimits.rules.map((r) =>
      r.label === "reports:create" ? { label: r.label, audience: r.audience, duration: 600, maxRequests: 5 } : r,
    )
    app.save(settings)
  },
)
