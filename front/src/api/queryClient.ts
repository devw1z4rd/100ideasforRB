import { QueryClient } from "@tanstack/react-query"
import { pb } from "./pb"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Sign-in/out changes what API rules expose (own reports, moderation queue) — refetch everything.
pb.authStore.onChange(() => {
  void queryClient.invalidateQueries()
})
