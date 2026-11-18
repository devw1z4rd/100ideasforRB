import { useMemo } from "react"
import { sanitizeHtml } from "@/lib/html"
import { cn } from "@/lib/utils"

export function RichText({ html, className }: { html: string; className?: string }) {
  const clean = useMemo(() => sanitizeHtml(html), [html])
  return <div className={cn("rich-text", className)} dangerouslySetInnerHTML={{ __html: clean }} />
}
