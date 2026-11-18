/// <reference path="../pb_data/types.d.ts" />
// Лимит анонимных обращений: 10 за 10 минут с одного IP. Считаются и неудачные попытки — человеку, у которого
// отклонили текст (мат), нужно пару раз переписать; 5 было впритык.
// На проде за Caddy: Settings → Trusted proxy → заголовок X-Forwarded-For, иначе все гости — один IP (CLAUDE.md §12).
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
