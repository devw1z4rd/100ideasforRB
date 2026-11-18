import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import zlib from "node:zlib"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

const pocketbase = "http://127.0.0.1:8090"

/**
 * Moves stylesheets from <head> to the end of <body>: a <head> stylesheet blocks rendering, so the index.html
 * shell would wait for CSS (~1.5 s on Slow 4G). main.tsx starts React only after the styles load.
 */
const stylesAfterShell = (): Plugin => ({
  name: "styles-after-shell",
  apply: "build",
  transformIndexHtml: {
    order: "post",
    handler(html) {
      const links: string[] = []
      const head = html.replace(/\s*<link rel="stylesheet"[^>]*>/g, (link) => {
        links.push(link.trim())
        return ""
      })
      return head.replace("</body>", `  ${links.join("\n    ")}\n  </body>`)
    },
  },
})

/**
 * Service worker (sw/sw.js): the build prepends VERSION and the precache list. VERSION is a hash of the list,
 * so any changed file installs a new worker.
 */
const serviceWorker = (): Plugin => ({
  name: "service-worker",
  apply: "build",
  generateBundle(_, bundle) {
    const assets = Object.keys(bundle)
      .filter((f) => /\.(js|mjs|css)$/.test(f) || /inter(-tight)?-(cyrillic|latin)-wght/.test(f))
      .map((f) => `/${f}`)
    const geo = fs.readdirSync(path.resolve(import.meta.dirname, "public/geo")).map((f) => `/geo/${f}`)
    const precache = ["/", "/favicon.svg", ...geo, ...assets].sort()
    const source = fs.readFileSync(path.resolve(import.meta.dirname, "sw/sw.js"), "utf8")
    const version = createHash("sha1")
      .update(JSON.stringify(precache))
      .update(source)
      .digest("hex")
      .slice(0, 12)
    this.emitFile({
      type: "asset",
      fileName: "sw.js",
      source: `const VERSION = "${version}"\nconst PRECACHE = ${JSON.stringify(precache)}\n${source}`,
    })
  },
})

/**
 * Writes .br and .gz next to each text asset; Caddy serves them as is (`precompressed br gzip`). Max-level
 * brotli is 15–20 % smaller than gzip but too slow to compress on the fly.
 */
const precompress = (): Plugin => {
  let dist = ""
  return {
    name: "precompress",
    apply: "build",
    configResolved(config) {
      dist = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      if (!fs.existsSync(dist)) return
      for (const entry of fs.readdirSync(dist, { recursive: true, encoding: "utf8" })) {
        const file = path.join(dist, entry)
        if (!/\.(js|mjs|css|html|svg|json|geojson|txt)$/.test(file) || !fs.statSync(file).isFile()) continue
        const body = fs.readFileSync(file)
        if (body.length < 1024) continue
        fs.writeFileSync(
          `${file}.br`,
          zlib.brotliCompressSync(body, {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
              [zlib.constants.BROTLI_PARAM_SIZE_HINT]: body.length,
            },
          }),
        )
        fs.writeFileSync(`${file}.gz`, zlib.gzipSync(body, { level: 9 }))
      }
    },
  }
}

/**
 * Link previews (Telegram, VK, Facebook) want an absolute og:image, so __SITE_URL__ in index.html becomes
 * VITE_SITE_URL. Without it the URL stays relative, which not every previewer resolves.
 */
const socialMeta = (): Plugin => {
  let site = ""
  return {
    name: "social-meta",
    configResolved(config) {
      site = String(config.env.VITE_SITE_URL ?? "").replace(/\/+$/, "")
      if (config.command === "build" && !site)
        config.logger.warn(
          "VITE_SITE_URL is not set: og:image stays relative, link previews may lack the image",
        )
    },
    transformIndexHtml: (html) => html.replaceAll("__SITE_URL__", site),
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), stylesAfterShell(), serviceWorker(), precompress(), socialMeta()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  server: { proxy: { "/api": pocketbase, "/_/": pocketbase } },
  build: {
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            {
              name: "react",
              test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
            },
            {
              name: "data",
              test: /node_modules[\\/](pocketbase|@tanstack)[\\/]/,
            },
            {
              name: "motion",
              test: /node_modules[\\/](motion|motion-dom|motion-utils|framer-motion)[\\/]/,
            },
          ],
        },
      },
    },
  },
})
