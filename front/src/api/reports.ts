import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { pb } from "./pb"
import { ClientResponseError } from "pocketbase"
import type {
  DistrictsResponse,
  ReportEventsResponse,
  GeoPoint,
  ReportsCategoryOptions,
  ReportsResponse,
  ReportsStatusOptions,
} from "./pocketbase-types"

/** Обращение с названием района (expand) — для списков и карточки */
/** Автопроверка (back/pb_hooks/lib/autocheck.js) — приходит только модераторам */
export type AutoCheck = { score: number; reasons: { delta: number; text: string }[] }
export type ReportWithDistrict = ReportsResponse<
  AutoCheck,
  { district?: Pick<DistrictsResponse, "id" | "name"> }
>

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
    queryFn: () =>
      pb.collection("reports").getFullList<ReportWithDistrict>({
        filter: reportsFilter(filter),
        sort: "-created",
        expand: "district",
        fields: "*,expand.district.id,expand.district.name",
      }),
    staleTime: 30_000,
  })

export const reportQuery = (id: string) =>
  queryOptions({
    queryKey: ["reports", id],
    queryFn: () =>
      pb.collection("reports").getOne<ReportWithDistrict>(id, {
        expand: "district",
        fields: "*,expand.district.id,expand.district.name",
      }),
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

const randomString = (length: number, alphabet: string) =>
  Array.from(crypto.getRandomValues(new Uint8Array(length)), (b) => alphabet[b % alphabet.length]).join("")

/**
 * Отправить обращение — с входом или без (вход по желанию). Id и личный ключ придумывает браузер: аноним
 * без права просмотра всё равно узнаёт, куда идти, — ссылка /reports/{id}?key=… и есть его «квитанция».
 * Автора, статус и район ставит сервер; точка вне области вернёт 400 с ошибкой у поля location.
 */
export async function createReport({ location, category, description, photos }: NewReport) {
  const id = randomString(15, "abcdefghijklmnopqrstuvwxyz0123456789")
  const key = pb.authStore.isValid
    ? ""
    : randomString(32, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789")
  // Ключ — заголовком: скрытое поле access_key PocketBase из тела запроса не принимает
  await pb
    .collection("reports")
    .create(
      { id, location, category, description, photos: [...photos] },
      key ? { headers: { "X-Report-Key": key } } : {},
    )
  if (key) rememberReport(id, key)
  return { id, key }
}

// Обращения анонима на этом устройстве — чтобы найти их без ссылки (вкладка «Мои»)
const DEVICE_KEY = "eco-reports"
type DeviceReport = { id: string; key: string }
export function deviceReports(): DeviceReport[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(DEVICE_KEY) ?? "[]")
    return Array.isArray(list) ? (list as DeviceReport[]) : []
  } catch {
    return []
  }
}
function rememberReport(id: string, key: string) {
  try {
    localStorage.setItem(DEVICE_KEY, JSON.stringify([{ id, key }, ...deviceReports()].slice(0, 50)))
  } catch {
    // Хранилище недоступно (приватный режим) — останется ссылка
  }
}

/** Обращение по личной ссылке анонима (back/pb_hooks/reports.pb.js, /api/eco/reports/{id}) */
async function fetchKeyed(id: string, key: string) {
  const res = await pb.send<{
    report: ReportsResponse<AutoCheck>
    district: string
    events: ReportEventsResponse[]
  }>(`/api/eco/reports/${encodeURIComponent(id)}`, { query: { key } })
  const report: ReportWithDistrict = {
    ...res.report,
    expand: res.report.district ? { district: { id: res.report.district, name: res.district } } : {},
  }
  return { report, events: res.events }
}

/** Аноним без realtime — статус перезапрашивается раз в минуту */
export const keyedReportQuery = (id: string, key: string) =>
  queryOptions({
    queryKey: ["reports", id, "key", key],
    queryFn: () => fetchKeyed(id, key),
    refetchInterval: 60_000,
  })
export const useKeyedReport = (id: string, key: string | null) =>
  useQuery({ ...keyedReportQuery(id, key ?? ""), enabled: Boolean(key) })

/** Обращения анонима с этого устройства; удалённые и чужие пропускаются */
export const useDeviceReports = (enabled: boolean) =>
  useQuery({
    queryKey: ["reports", "device"],
    enabled,
    queryFn: async () => {
      const results = await Promise.allSettled(deviceReports().map((r) => fetchKeyed(r.id, r.key)))
      return results.flatMap((r) => (r.status === "fulfilled" ? [r.value.report] : []))
    },
  })

/** Ключ обращения с этого устройства — чтобы в списке «Мои» ссылка вела на карточку с ключом */
export const deviceKey = (id: string) => deviceReports().find((r) => r.id === id)?.key ?? null

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

/** Ссылка на фото обращения (файлы отдаёт PocketBase) */
export const reportPhotoUrl = (report: ReportsResponse, file: string) => pb.files.getURL(report, file)

/** Сообщение сервера для поля (ошибка валидации PocketBase) или null */
export function fieldError(error: unknown, field: string): string | null {
  if (!(error instanceof ClientResponseError)) return null
  const data = error.response?.data as Record<string, { message?: string }> | undefined
  return data?.[field]?.message ?? null
}

/** Статус ответа сервера (0 — нет связи) или null, если ошибка не от PocketBase */
export const errorStatus = (error: unknown) => (error instanceof ClientResponseError ? error.status : null)

export type ShowcaseReport = ReportWithDistrict & { resolvedAt: string | null }

/**
 * Витрина (/results): опубликованные обращения и когда каждое устранили (событие → resolved в истории).
 * История устранённых видна всем — правило report_events пускает к опубликованным обращениям.
 */
export const showcaseQuery = () =>
  queryOptions({
    queryKey: ["reports", "showcase"],
    queryFn: async (): Promise<ShowcaseReport[]> => {
      const [reports, resolved] = await Promise.all([
        pb.collection("reports").getFullList<ReportWithDistrict>({
          filter: reportsFilter({ status: ["accepted", "forwarded", "resolved"] }),
          sort: "-created",
          expand: "district",
          fields: "*,expand.district.id,expand.district.name",
        }),
        pb.collection("report_events").getFullList({ filter: 'to_status = "resolved"', sort: "created" }),
      ])
      const resolvedAt = new Map(resolved.map((e) => [e.report, e.created]))
      return reports.map((r) => ({ ...r, resolvedAt: resolvedAt.get(r.id) ?? null }))
    },
    staleTime: 60_000,
  })
export const useShowcase = () => useQuery(showcaseQuery())
