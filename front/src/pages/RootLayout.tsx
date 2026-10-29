import { LazyMotion, MotionConfig, domAnimation } from "motion/react"
import { Outlet, ScrollRestoration } from "react-router"
import { SiteFooter } from "@/components/layout/SiteFooter"

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
        <main id="content" tabIndex={-1} className="outline-none">
          <Outlet />
        </main>
        <SiteFooter />
        <ScrollRestoration />
      </LazyMotion>
    </MotionConfig>
  )
}
