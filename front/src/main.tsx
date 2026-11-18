import { QueryClientProvider } from "@tanstack/react-query"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter } from "react-router"
import { RouterProvider } from "react-router/dom"
import { queryClient } from "@/api/queryClient"
import { loadMapView } from "@/components/map/loadMapView"
import { registerServiceWorker } from "@/lib/serviceWorker"
import { routes } from "@/routes"
import "./index.css"

const router = createBrowserRouter(routes)

// В сборке стили подключены в конце <body> (vite.config.ts, stylesAfterShell), чтобы не задерживать заглушку
// из index.html. Рендер — когда они загрузились: иначе страница мелькнула бы без оформления
const stylesReady = Promise.all(
  [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map(
    (link) =>
      link.sheet ??
      new Promise((resolve) => {
        link.addEventListener("load", resolve)
        link.addEventListener("error", resolve)
      }),
  ),
)

void stylesReady.then(() =>
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  ),
)

// На главной код карты начинает качаться сразу, ещё до первого рендера; service worker — после него
registerServiceWorker(location.pathname === "/" ? loadMapView() : undefined)
