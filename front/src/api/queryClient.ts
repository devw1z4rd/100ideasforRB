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
export const refetchOnAuthChange = (client: QueryClient) =>
  pb.authStore.onChange(() => {
    void client.invalidateQueries()
  })

refetchOnAuthChange(queryClient)
