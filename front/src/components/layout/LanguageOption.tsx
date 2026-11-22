import { Languages } from "lucide-react"
import { alternateLocale } from "@/lib/locale"

export function LanguageOption() {
  return (
    <span className="inline-flex items-center gap-2" lang={alternateLocale}>
      <Languages aria-hidden="true" className="size-4" />
      {alternateLocale === "be" ? "Беларуская" : "Русский"}
    </span>
  )
}
