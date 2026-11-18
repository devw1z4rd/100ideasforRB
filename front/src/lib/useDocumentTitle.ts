import { useEffect } from "react"
import { site } from "@/content/nav"

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — ${site.name}` : site.title
  }, [title])
}
