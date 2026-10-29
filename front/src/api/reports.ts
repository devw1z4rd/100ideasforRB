import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { pb } from "./pb"
import type { GeoPoint, ReportsCategoryOptions, ReportsStatusOptions } from "./pocketbase-types"

// Гражданские обращения (CLAUDE.md §4 M3–M6). Что кому видно и кто что меняет, решают API rules и
// back/pb_hooks/reports.pb.js; здесь только запросы. Ошибки сервера (ClientResponseError) показывает вызывающий.

export type ReportsFilter = {
  status?: readonly ReportsStatusOptions[]
  district?: string
  /** Только свои — для профиля */
  author?: string
}

/** Фильтр PocketBase для списка обращений; пустые условия пропускаются. */
export function reportsFilter({ status, district, author }: ReportsFilter): string {
  const parts: string[] = []
  if (status?.length) parts.push(`(${status.map((s) => pb.filter("status = {:s}", { s })).join(" || ")})`)
  if (district) parts.push(pb.filter("district = {:district}", { district }))
  if (author) parts.push(pb.filter("author = {:author}", { author }))
  return parts.join(" && ")
}

export const reportsQuery = (filter: ReportsFilter = {}) =>
  queryOptions({
    queryKey: ["reports", "list", filter],
    queryFn: () => pb.collection("reports").getFullList({ filter: reportsFilter(filter), sort: "-created" }),
    staleTime: 30_000,
  })

export const reportQuery = (id: string) =>
  queryOptions({
    queryKey: ["reports", id],
    queryFn: () => pb.collection("reports").getOne(id),
    staleTime: 30_000,
  })

/** История статусов по порядку; первая запись — создание (from_status пустой). */
export const reportEventsQuery = (id: string) =>
  queryOptions({
    queryKey: ["reports", id, "events"],
    queryFn: () =>
      pb
        .collection("report_events")
        .getFullList({ filter: pb.filter("report = {:id}", { id }), sort: "created" }),
    staleTime: 30_000,
  })

export const useReports = (filter?: ReportsFilter) => useQuery(reportsQuery(filter))
export const useReport = (id: string) => useQuery(reportQuery(id))
export const useReportEvents = (id: string) => useQuery(reportEventsQuery(id))

/**
 * Realtime (M4): новые и изменённые обращения и события статусов приходят без перезагрузки.
 * PocketBase присылает только записи, которые подписчик вправе видеть, поэтому достаточно перезапросить кэш.
 */
export function useReportsRealtime() {
  const queryClient = useQueryClient()
  useEffect(() => {
    const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["reports"] })
    const subscriptions = [
      pb.collection("reports").subscribe("*", invalidate),
      pb.collection("report_events").subscribe("*", invalidate),
    ]
    return () => {
      for (const s of subscriptions) void s.then((unsubscribe) => unsubscribe()).catch(() => {})
    }
  }, [queryClient])
}

export type NewReport = {
  location: GeoPoint
  category: ReportsCategoryOptions
  description: string
  photos: readonly File[]
}

/** Автора, статус и район проставляет сервер; точка вне области вернёт 400 с ошибкой у поля location. */
export function createReport({ location, category, description, photos }: NewReport) {
  return pb.collection("reports").create({ location, category, description, photos: [...photos] })
}

export type StatusChange = { id: string; status: ReportsStatusOptions; comment?: string }

/** Смена статуса модератором; комментарий попадает в обращение и в историю (report_events). */
export function changeReportStatus({ id, status, comment }: StatusChange) {
  return pb
    .collection("reports")
    .update(id, comment === undefined ? { status } : { status, moderator_comment: comment })
}

export function useCreateReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createReport,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports"] }),
  })
}

export function useChangeReportStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: changeReportStatus,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports"] }),
  })
}
