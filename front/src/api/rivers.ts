import { queryOptions, useQuery } from "@tanstack/react-query"
import type { RiverLevel, RiverPost } from "@/lib/rivers"
import { pbDay } from "./dates"
import { takeHome } from "./home"
import { pb } from "./pb"
import type { RiverLevelsResponse } from "./pocketbase-types"

const DAYS = 30
const STALE = 60 * 60_000

export const riverPostsQuery = () =>
  queryOptions({
    queryKey: ["rivers", "posts"],
    queryFn: async () =>
      (await takeHome("riverPosts")) ??
      (await pb.collection("river_posts").getFullList<RiverPost>({
        fields: "id,code,name,river,district,lat,lon,low_level,flood_level,danger_level",
        sort: "river,name",
      })),
    staleTime: STALE,
  })

type LevelRow = Pick<RiverLevelsResponse, "post" | "date" | "level" | "change" | "ice">

export const riverLevelsQuery = () =>
  queryOptions({
    queryKey: ["rivers", "levels", DAYS],
    queryFn: async (): Promise<RiverLevel[]> => {
      const rows =
        (await takeHome("riverLevels")) ??
        (await pb.collection("river_levels").getFullList<LevelRow>({
          filter: pb.filter("date >= {:since}", { since: new Date(Date.now() - (DAYS + 1) * 86_400_000) }),
          fields: "post,date,level,change,ice",
          sort: "date",
        }))
      // 8:00 Minsk time = 05:00 UTC the same day.
      return rows.map((r) => ({
        post: r.post,
        day: pbDay(r.date),
        level: r.level,
        change: r.change,
        ice: r.ice,
      }))
    },
    staleTime: STALE,
  })

export const useRiverPosts = () => useQuery(riverPostsQuery())
export const useRiverLevels = () => useQuery(riverLevelsQuery())
