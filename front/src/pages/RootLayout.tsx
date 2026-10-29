import { LazyMotion, MotionConfig, domAnimation } from "motion/react"
import { useLayoutEffect } from "react"
import { Outlet, ScrollRestoration, useLocation, useNavigationType, type Location } from "react-router"
import { SiteFooter } from "@/components/layout/SiteFooter"
import { SiteHeader } from "@/components/layout/SiteHeader"

// Для адресов с якорем ключ не location.key: иначе сохранённая позиция entry "default" перебивает переход к #якорю.
// Следствие: Back/Forward к записи с якорем заново прокручивает к якорю (эффект HomePage по location.key),
// а не восстанавливает точную позицию чтения.
const getScrollKey = (location: Location) =>
  location.hash ? `${location.pathname}${location.hash}` : location.key

/**
 * `html { scroll-behavior: smooth }` анимирует и window.scrollTo из ScrollRestoration.
 * На время восстановления позиции (Back/Forward) и сброса при смене страницы без якоря — мгновенный скролл;
 * плавным остаётся прокрутка к якорям и кнопка «Наверх». Рендерить строго ПЕРЕД <ScrollRestoration>:
 * layout-эффекты соседей выполняются в порядке дерева.
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
