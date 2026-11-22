import type { ComponentType } from "react"
import type { RouteObject } from "react-router"
import type { RouteHandle } from "@/lib/routeTitle"
import { DataPage } from "@/pages/DataPage"
import { HomePage } from "@/pages/HomePage"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { RootLayout } from "@/pages/RootLayout"
import { RouteErrorPage } from "@/pages/RouteErrorPage"

const page = (title: string, load: () => Promise<{ Component: ComponentType }>): RouteObject => ({
  lazy: load,
  handle: { title } satisfies RouteHandle,
})

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
    path: "reset-password",
    ...page("Восстановление пароля", () =>
      import("@/pages/ResetPasswordPage").then((m) => ({ Component: m.ResetPasswordPage })),
    ),
  },
  {
    path: "me",
    ...page("Профиль", () => import("@/pages/ReportsPages").then((m) => ({ Component: m.MePage }))),
  },
  {
    path: "moderation",
    ...page("Модерация", () => import("@/pages/ModerationPage").then((m) => ({ Component: m.ModerationPage }))),
  },
]

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        // Pathless route: page errors render inside the layout, so header and footer stay.
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
          // PROTOTYPE — dev builds only: neither the route nor its code reaches production.
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
