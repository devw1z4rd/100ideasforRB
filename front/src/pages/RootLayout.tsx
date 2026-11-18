import { LazyMotion, MotionConfig, domAnimation } from "motion/react"
import { useLayoutEffect } from "react"
import { Outlet, ScrollRestoration, useLocation, useNavigationType, type Location } from "react-router"
import { SiteFooter } from "@/components/layout/SiteFooter"
import { SiteHeader } from "@/components/layout/SiteHeader"

// Anchored URLs don't use location.key, otherwise the saved "default" position overrides the jump to #anchor.
// Side effect: Back/Forward to an anchored entry re-scrolls to the anchor instead of restoring the exact
// position.
const getScrollKey = (location: Location) =>
  location.hash ? `${location.pathname}${location.hash}` : location.key

/**
 * `html { scroll-behavior: smooth }` also animates ScrollRestoration's window.scrollTo, so scrolling is
 * instant while restoring or resetting the position. Must render BEFORE <ScrollRestoration>: sibling layout
 * effects run in tree order.
 */
function InstantScrollRestoration() {
  const { key, hash } = useLocation()
  const navigationType = useNavigationType()
  useLayoutEffect(() => {
    if (navigationType !== "POP" && hash) return
    const root = document.documentElement
    root.style.scrollBehavior = "auto"
    requestAnimationFrame(() => root.style.removeProperty("scroll-behavior"))
  }, [key, hash, navigationType])
  return null
}

export function RootLayout() {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          К содержимому
        </a>
        <SiteHeader />
        <main id="content" tabIndex={-1} className="outline-none">
          <Outlet />
        </main>
        <SiteFooter />
        <InstantScrollRestoration />
        <ScrollRestoration getKey={getScrollKey} />
      </LazyMotion>
    </MotionConfig>
  )
}
