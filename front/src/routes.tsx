import type { RouteObject } from "react-router"
import type { RouteHandle } from "@/lib/routeTitle"
import { HomePage } from "@/pages/HomePage"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { RootLayout } from "@/pages/RootLayout"
import { StubPage } from "@/pages/StubPage"

// Страницы CLAUDE.md §11, которые появятся в следующих подпроектах
const stubs: ReadonlyArray<readonly [path: string, title: string]> = [
  ["reports", "Обращения"],
  ["reports/new", "Сообщить о проблеме"],
  ["reports/:id", "Обращение"],
  ["compare", "Сравнение районов"],
  ["calculator", "Калькулятор углеродного следа"],
  ["news", "Новости"],
  ["news/:slug", "Новости"],
  ["kb", "База знаний"],
  ["kb/:slug", "База знаний"],
  ["data", "Данные и методика"],
  ["login", "Вход"],
  ["me", "Профиль"],
  ["moderation", "Модерация"],
]

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      ...stubs.map(([path, title]) => ({
        path,
        element: <StubPage />,
        handle: { title } satisfies RouteHandle,
      })),
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]
