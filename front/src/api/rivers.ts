import { queryOptions, useQuery } from "@tanstack/react-query"
import type { RiverLevel, RiverPost } from "@/lib/rivers"
import { pbDay } from "./dates"
import { pb } from "./pb"
import type { RiverLevelsResponse } from "./pocketbase-types"

// Уровни воды (CLAUDE.md §8, §9): посты области и ежедневные наблюдения Белгидромета на 8:00.
// Пишет cron river_fetch дважды в сутки; на фронте — последние 30 дней.

const DAYS = 30
// Данные меняются раз в сутки: держим час и не перезапрашиваем на каждый фокус окна
const STALE = 60 * 60_000

export const riverPostsQuery = () =>
  queryOptions({
    queryKey: ["rivers", "posts"],
    queryFn: () =>
      pb.collection("river_posts").getFullList<RiverPost>({
        fields: "id,code,name,river,district,lat,lon,low_level,flood_level,danger_level",
        sort: "river,name",
      }),
    staleTime: STALE,
  })

type LevelRow = Pick<RiverLevelsResponse, "post" | "date" | "level" | "change" | "ice">

export const riverLevelsQuery = () =>
  queryOptions({
    queryKey: ["rivers", "levels", DAYS],
    queryFn: async (): Promise<RiverLevel[]> => {
      const rows = await pb.collection("river_levels").getFullList<LevelRow>({
        filter: pb.filter("date >= {:since}", { since: new Date(Date.now() - (DAYS + 1) * 86_400_000) }),
        fields: "post,date,level,change,ice",
        sort: "date",
      })
      // 8:00 по Минску — 05:00 UTC того же дня
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
