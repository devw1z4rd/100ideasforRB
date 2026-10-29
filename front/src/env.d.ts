interface ImportMetaEnv {
  /** Адрес PocketBase, если фронт запущен не с того же origin (по умолчанию "/", см. src/api/pb.ts) */
  readonly VITE_PB_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
