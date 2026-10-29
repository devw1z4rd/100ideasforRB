import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Локальная PocketBase (CLAUDE.md §12): API и админка идут через прокси — один origin, без CORS
const pocketbase = "http://127.0.0.1:8090"

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
