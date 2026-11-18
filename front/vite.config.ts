import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import zlib from "node:zlib"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

// Локальная PocketBase (CLAUDE.md §12): API и админка идут через прокси — один origin, без CORS
const pocketbase = "http://127.0.0.1:8090"

/**
 * Стили — из <head> в конец <body>: таблица в <head> блокирует отрисовку, и заглушка первого экрана из
 * index.html ждала бы CSS (на Slow 4G — лишние ~1,5 с пустого экрана). React стартует только после загрузки
 * стилей (main.tsx), так что страница без оформления не мелькает.
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
 * Service worker (sw/sw.js): в сборке к нему дописываются версия и список файлов для кэша — весь JS и CSS,
 * шрифты кириллицы и латиницы, слои карты и сама страница. Версия — хэш списка: изменился любой файл —
 * браузер ставит новый worker и докачивает только новое (остальное берёт из HTTP-кэша).
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
 * Рядом с каждым текстовым файлом сборки — его .br и .gz: Caddy отдаёт их готовыми (`precompressed br gzip`).
 * Brotli максимального уровня на 15–20 % меньше gzip, а сжимать так на лету слишком дорого.
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

export default defineConfig({
  plugins: [react(), tailwindcss(), stylesAfterShell(), serviceWorker(), precompress()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  server: { proxy: { "/api": pocketbase, "/_/": pocketbase } },
  build: {
    // MapLibre (~1 МБ, ~300 КБ gzip) — отдельный ленивый чанк карты, грузится при подходе к ней; остальное заметно меньше
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        // Вендорные библиотеки — отдельными чанками: кэшируются между деплоями, главный чанк < 500 kB
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
