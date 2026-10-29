import { useEffect } from "react"
import { useLocation } from "react-router"
import { AirSection } from "@/components/sections/air/AirSection"
import { Hero } from "@/components/sections/Hero"
import { MapSection } from "@/components/sections/map/MapSection"
import { SectionPlaceholder } from "@/components/sections/SectionPlaceholder"
import { homeSections } from "@/content/home"
import { useDocumentTitle } from "@/lib/useDocumentTitle"

export function HomePage() {
  useDocumentTitle()
  const { hash, key } = useLocation()

  // Прокрутка к якорю после навигации: /#air с другой страницы, пункты MobileNav, повторный клик по якорю.
  useEffect(() => {
    if (!hash) return
    let id: string
    try {
      id = decodeURIComponent(hash.slice(1))
    } catch {
      return
    }
    document.getElementById(id)?.scrollIntoView()
  }, [hash, key])

  return (
    <>
      <Hero />
      {homeSections.map((section) =>
        section.id === "map" ? (
          <MapSection key={section.id} {...section} />
        ) : section.id === "air" ? (
          <AirSection key={section.id} {...section} />
        ) : (
          <SectionPlaceholder key={section.id} {...section} />
        ),
      )}
    </>
  )
}
