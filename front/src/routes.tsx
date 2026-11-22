import { t } from "@/lib/locale"
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
    ...page(t("Обращения", "Звароты"), () =>
      import("@/pages/ReportsPages").then((m) => ({ Component: m.ReportsPage })),
    ),
  },
  {
    path: "reports/new",
    ...page(t("Сообщить о проблеме", "Паведаміць пра праблему"), () =>
      import("@/pages/ReportNewPage").then((m) => ({ Component: m.ReportNewPage })),
    ),
  },
  {
    path: "reports/:id",
    ...page(t("Обращение", "Зварот"), () =>
      import("@/pages/ReportPage").then((m) => ({ Component: m.ReportPage })),
    ),
  },
  {
    path: "results",
    ...page(t("Результаты", "Вынікі"), () =>
      import("@/pages/ResultsPage").then((m) => ({ Component: m.ResultsPage })),
    ),
  },
  {
    path: "login",
    ...page(t("Вход", "Уваход"), () => import("@/pages/LoginPage").then((m) => ({ Component: m.LoginPage }))),
  },
  {
    path: "reset-password",
    ...page(t("Восстановление пароля", "Аднаўленне пароля"), () =>
      import("@/pages/ResetPasswordPage").then((m) => ({ Component: m.ResetPasswordPage })),
    ),
  },
  {
    path: "me",
    ...page(t("Профиль", "Профіль"), () =>
      import("@/pages/ReportsPages").then((m) => ({ Component: m.MePage })),
    ),
  },
  {
    path: "moderation",
    ...page(t("Модерация", "Мадэрацыя"), () =>
      import("@/pages/ModerationPage").then((m) => ({ Component: m.ModerationPage })),
    ),
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
            handle: { title: t("Данные и методика", "Даныя і методыка") } satisfies RouteHandle,
          },
          {
            path: "news",
            ...page(t("Новости", "Навіны"), () =>
              import("@/pages/NewsPage").then((m) => ({ Component: m.NewsPage })),
            ),
          },
          {
            path: "news/:slug",
            ...page(t("Новости", "Навіны"), () =>
              import("@/pages/NewsArticlePage").then((m) => ({ Component: m.NewsArticlePage })),
            ),
          },
          {
            path: "compare",
            ...page(t("Сравнение районов", "Параўнанне раёнаў"), () =>
              import("@/pages/ComparePage").then((m) => ({ Component: m.ComparePage })),
            ),
          },
          {
            path: "kb",
            ...page(t("База знаний", "База ведаў"), () =>
              import("@/pages/KbPage").then((m) => ({ Component: m.KbPage })),
            ),
          },
          {
            path: "kb/:slug",
            ...page(t("База знаний", "База ведаў"), () =>
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
