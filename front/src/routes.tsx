import type { ComponentType } from "react"
import type { RouteObject } from "react-router"
import type { RouteHandle } from "@/lib/routeTitle"
import { DataPage } from "@/pages/DataPage"
import { HomePage } from "@/pages/HomePage"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { RootLayout } from "@/pages/RootLayout"
import { RouteErrorPage } from "@/pages/RouteErrorPage"
import { StubPage } from "@/pages/StubPage"

// Новости, база знаний и калькулятор — отдельными чанками: главной они не нужны
const page = (title: string, load: () => Promise<{ Component: ComponentType }>): RouteObject => ({
  lazy: load,
  handle: { title } satisfies RouteHandle,
})

// Страницы CLAUDE.md §11, которые появятся в следующих подпроектах
const stubs: ReadonlyArray<readonly [path: string, title: string]> = [
  ["reports", "Обращения"],
  ["reports/new", "Сообщить о проблеме"],
  ["reports/:id", "Обращение"],
  ["compare", "Сравнение районов"],
  ["login", "Вход"],
  ["me", "Профиль"],
  ["moderation", "Модерация"],
]

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    // Страховка на случай, если упал сам layout; обычные ошибки страниц ловит дочерний errorElement
    errorElement: <RouteErrorPage />,
    children: [
      {
        // Безпутевой маршрут: ошибка страницы рендерится внутри layout — шапка и футер остаются
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, element: <HomePage /> },
          {
            path: "data",
            element: <DataPage />,
            handle: { title: "Данные и методика" } satisfies RouteHandle,
          },
          {
            path: "news",
            ...page("Новости", () => import("@/pages/NewsPage").then((m) => ({ Component: m.NewsPage }))),
          },
          {
            path: "news/:slug",
            ...page("Новости", () =>
              import("@/pages/NewsArticlePage").then((m) => ({ Component: m.NewsArticlePage })),
            ),
          },
          {
            path: "calculator",
            ...page("Калькулятор углеродного следа", () =>
              import("@/pages/CalculatorPage").then((m) => ({ Component: m.CalculatorPage })),
            ),
          },
          {
            path: "kb",
            ...page("База знаний", () => import("@/pages/KbPage").then((m) => ({ Component: m.KbPage }))),
          },
          {
            path: "kb/:slug",
            ...page("База знаний", () =>
              import("@/pages/KbArticlePage").then((m) => ({ Component: m.KbArticlePage })),
            ),
          },
          ...stubs.map(([path, title]) => ({
            path,
            element: <StubPage />,
            handle: { title } satisfies RouteHandle,
          })),
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]
