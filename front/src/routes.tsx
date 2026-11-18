import type { ComponentType } from "react"
import type { RouteObject } from "react-router"
import type { RouteHandle } from "@/lib/routeTitle"
import { DataPage } from "@/pages/DataPage"
import { HomePage } from "@/pages/HomePage"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { RootLayout } from "@/pages/RootLayout"
import { RouteErrorPage } from "@/pages/RouteErrorPage"

// Новости, база знаний и сравнение районов — отдельными чанками: главной они не нужны
const page = (title: string, load: () => Promise<{ Component: ComponentType }>): RouteObject => ({
  lazy: load,
  handle: { title } satisfies RouteHandle,
})

// Обращения, вход, профиль и модерация (CLAUDE.md §4 M3–M6, §11) — отдельными чанками
const accountPages: RouteObject[] = [
  {
    path: "reports",
    ...page("Обращения", () => import("@/pages/ReportsPages").then((m) => ({ Component: m.ReportsPage }))),
  },
  {
    path: "reports/new",
    ...page("Сообщить о проблеме", () =>
      import("@/pages/ReportNewPage").then((m) => ({ Component: m.ReportNewPage })),
    ),
  },
  {
    path: "reports/:id",
    ...page("Обращение", () => import("@/pages/ReportPage").then((m) => ({ Component: m.ReportPage }))),
  },
  {
    path: "results",
    ...page("Результаты", () => import("@/pages/ResultsPage").then((m) => ({ Component: m.ResultsPage }))),
  },
  {
    path: "login",
    ...page("Вход", () => import("@/pages/LoginPage").then((m) => ({ Component: m.LoginPage }))),
  },
  {
    path: "me",
    ...page("Профиль", () => import("@/pages/ReportsPages").then((m) => ({ Component: m.MePage }))),
  },
  {
    path: "moderation",
    ...page("Модерация", () => import("@/pages/ReportsPages").then((m) => ({ Component: m.ModerationPage }))),
  },
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
            path: "compare",
            ...page("Сравнение районов", () =>
              import("@/pages/ComparePage").then((m) => ({ Component: m.ComparePage })),
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
          // PROTOTYPE — только в dev-сборке: в продакшен маршрут и его код не попадают
          ...(import.meta.env.DEV
            ? [
                {
                  path: "prototype/air-kids",
                  ...page("Прототип: воздух для детей", () =>
                    import("@/pages/prototype/air-kids/AirKidsPrototypePage").then((m) => ({
                      Component: m.AirKidsPrototypePage,
                    })),
                  ),
                },
              ]
            : []),
          ...accountPages,
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]
