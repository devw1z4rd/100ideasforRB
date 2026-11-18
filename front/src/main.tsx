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

// In builds CSS is moved to the end of <body> (stylesAfterShell in vite.config.ts) so it doesn't block the
// index.html shell; render only once it has loaded, otherwise the page flashes unstyled.
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

registerServiceWorker(location.pathname === "/" ? loadMapView() : undefined)
