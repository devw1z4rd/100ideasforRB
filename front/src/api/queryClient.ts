import { QueryClient } from "@tanstack/react-query"
import { pb } from "./pb"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Воздух обновляется раз в час, справочники — при деплое: 5 минут свежести с запасом
      staleTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Вход и выход меняют видимость записей по API rules (свои обращения, очередь модерации) — перезапросить всё
pb.authStore.onChange(() => {
  void queryClient.invalidateQueries()
})
