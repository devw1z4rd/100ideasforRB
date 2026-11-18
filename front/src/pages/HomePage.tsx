import { useEffect, useState, type ComponentType } from "react"
import { useLocation } from "react-router"
import { loadMapView } from "@/components/map/loadMapView"
import { MapSection } from "@/components/sections/map/MapSection"
import { SectionPlaceholder } from "@/components/sections/SectionPlaceholder"
import { homeSections, type HomeSection, type SectionId } from "@/content/home"
import { useDocumentTitle } from "@/lib/useDocumentTitle"

type SectionComponent = ComponentType<Pick<HomeSection, "id" | "eyebrow" | "title" | "variant">>
type RestSections = Partial<Record<SectionId, SectionComponent>>

// Below-the-fold sections are separate chunks. Loaded modules are cached for the session, so returning home
// renders them at once and ScrollRestoration lands correctly.
let rest: RestSections | null = null
let restLoading: Promise<RestSections> | null = null
const loadRest = () =>
  (restLoading ??= Promise.all([
    import("@/components/sections/air/AirSection"),
    import("@/components/sections/water/WaterSection"),
    import("@/components/sections/enterprises/EnterprisesSection"),
  ]).then(
    ([air, water, enterprises]) =>
      (rest = {
        air: air.AirSection,
        water: water.WaterSection,
        enterprises: enterprises.EnterprisesSection,
      }),
    (error: unknown) => {
      restLoading = null
      throw error
    },
  ))

export function HomePage() {
  useDocumentTitle()
  const { hash, key } = useLocation()
  const [sections, setSections] = useState(rest)

  useEffect(() => {
    if (sections) return
    let alive = true
    const load = () => {
      loadRest().then(
        (loaded) => alive && setSections(loaded),
        () => {},
      )
    }
    if (hash) load()
    else void loadMapView().then(load, load)
    window.addEventListener("scroll", load, { once: true, passive: true })
    return () => {
      alive = false
      window.removeEventListener("scroll", load)
    }
  }, [sections, hash])

  // Scroll to the anchor after navigation, and again once sections load: they're taller than their
  // placeholders, so the anchor moves.
  useEffect(() => {
    if (!hash) return
    let id: string
    try {
      id = decodeURIComponent(hash.slice(1))
    } catch {
      return
    }
    document.getElementById(id)?.scrollIntoView()
  }, [hash, key, sections])

  return (
    <>
      {homeSections.map((section) => {
        if (section.id === "map") return <MapSection key={section.id} {...section} />
        const Section = sections?.[section.id]
        return Section ? (
          <Section key={section.id} {...section} />
        ) : (
          <SectionPlaceholder key={section.id} {...section} />
        )
      })}
    </>
  )
}
