/// <reference path="../pb_data/types.d.ts" />
routerUse((e) => {
  if (/^\/api\/files\/(reports|pbc_1615648943)\//.test(e.request.url.path)) {
    // A previously published report may become rejected. Recheck access on every download.
    e.response.header().set("Cache-Control", "private, no-store")
    e.response.header().set("Referrer-Policy", "no-referrer")
  }
  e.next()
})
