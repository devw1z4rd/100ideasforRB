import { useMemo } from "react"
import { sanitizeHtml } from "@/lib/html"
import { cn } from "@/lib/utils"

/** Текст новости или статьи: HTML из админки после DOMPurify, оформление — .rich-text в index.css */
export function RichText({ html, className }: { html: string; className?: string }) {
  const clean = useMemo(() => sanitizeHtml(html), [html])
  return <div className={cn("rich-text", className)} dangerouslySetInnerHTML={{ __html: clean }} />
}
