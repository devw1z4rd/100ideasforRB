import { useEffect } from "react"
import { site } from "@/content/nav"

/** Заголовок вкладки: «<страница> — <сайт>»; без аргумента — заголовок главной. */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — ${site.name}` : site.title
  }, [title])
}
