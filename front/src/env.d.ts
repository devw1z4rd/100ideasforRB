interface ImportMetaEnv {
  readonly VITE_PB_URL?: string
  readonly VITE_YANDEX_MAPS_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
