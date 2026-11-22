import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { pb } from "./pb"
import { useAuth } from "./auth"
import { ClientResponseError } from "pocketbase"
import { isBelarusian } from "@/lib/locale"
import type {
  DistrictsResponse,
  ReportEventsResponse,
  GeoPoint,
  ReportsCategoryOptions,
  ReportsResponse,
  ReportsStatusOptions,
} from "./pocketbase-types"

export type AutoCheck = { score: number; reasons: { delta: number; text: string }[] }
export type ReportWithDistrict = ReportsResponse<
  AutoCheck,
  { district?: Pick<DistrictsResponse, "id" | "name" | "name_be"> }
>

export type ReportsFilter = {
  status?: readonly ReportsStatusOptions[]
  district?: string
  category?: ReportsCategoryOptions
  author?: string
  order?: "oldest" | "newest"
  duplicates?: "exclude" | "only"
}

// PocketBase can suppress the realtime event when an update makes the report private.
const PUBLIC_REPORT_REFRESH_MS = 30_000
const REPORT_DISTRICT_FIELDS = "*,expand.district.id,expand.district.name,expand.district.name_be"

export function reportsFilter({ status, district, category, author, duplicates }: ReportsFilter): string {
  const parts: string[] = []
  if (status?.length) parts.push(`(${status.map((s) => pb.filter("status = {:s}", { s })).join(" || ")})`)
  if (district) parts.push(pb.filter("district = {:district}", { district }))
  if (category) parts.push(pb.filter("category = {:category}", { category }))
  if (author) parts.push(pb.filter("author = {:author}", { author }))
  if (duplicates === "exclude") parts.push('duplicate_of = ""')
  if (duplicates === "only") parts.push('duplicate_of != ""')
  return parts.join(" && ")
}

export const reportsQuery = (filter: ReportsFilter = {}) =>
  queryOptions({
    queryKey: ["reports", "list", filter],
    queryFn: () =>
      pb.collection("reports").getFullList<ReportWithDistrict>({
        filter: reportsFilter(filter),
        sort: filter.order === "oldest" ? "created,id" : "-created,-id",
        expand: "district",
        fields: REPORT_DISTRICT_FIELDS,
      }),
    staleTime: 30_000,
    refetchInterval: filter.duplicates === "exclude" ? PUBLIC_REPORT_REFRESH_MS : undefined,
  })

export const reportQuery = (id: string) =>
  queryOptions({
    queryKey: ["reports", id],
    queryFn: () =>
      pb.collection("reports").getOne<ReportWithDistrict>(id, {
        expand: "district",
        fields: REPORT_DISTRICT_FIELDS,
      }),
    staleTime: 30_000,
  })

export const reportEventsQuery = (id: string) =>
  queryOptions({
    queryKey: ["reports", id, "events"],
    queryFn: () =>
      pb
        .collection("report_events")
        .getFullList({ filter: pb.filter("report = {:id}", { id }), sort: "created" }),
    staleTime: 30_000,
  })

export const useReports = (filter?: ReportsFilter, enabled = true) => useQuery({ ...reportsQuery(filter), enabled })
export const useReport = (id: string) => useQuery(reportQuery(id))
export const useReportEvents = (id: string) => useQuery(reportEventsQuery(id))

/** Realtime: PocketBase only sends records the subscriber may see, so invalidating the cache is enough. */
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

export async function createReport({ location, category, description, photos }: NewReport) {
  const id = randomString(15, "abcdefghijklmnopqrstuvwxyz0123456789")
  const key = pb.authStore.isValid
    ? ""
    : randomString(32, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789")
  // The key goes in a header: PocketBase doesn't accept the hidden access_key field from the body.
  await pb
    .collection("reports")
    .create(
      { id, location, category, description, photos: [...photos] },
      key ? { headers: { "X-Report-Key": key } } : {},
    )
  if (key) rememberReport(id, key)
  return { id, key }
}

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
  } catch {}
}

async function fetchKeyed(id: string, key: string) {
  const res = await pb.send<{
    report: ReportsResponse<AutoCheck>
    district: string
    districtNameBe?: string
    events: ReportEventsResponse[]
  }>(`/api/eco/reports/${encodeURIComponent(id)}`, { query: { key }, cache: "no-store" })
  const report: ReportWithDistrict = {
    ...res.report,
    expand: res.report.district
      ? { district: { id: res.report.district, name: res.district, name_be: res.districtNameBe ?? "" } }
      : {},
  }
  return { report, events: res.events }
}

const GUEST_REPORT_REFRESH_MS = 5_000

function reportIsInaccessible(error: unknown): boolean {
  return error instanceof ClientResponseError && (error.status === 403 || error.status === 404)
}

export const keyedReportQuery = (id: string, key: string) =>
  queryOptions({
    queryKey: ["reports", id, "key", key],
    queryFn: () => fetchKeyed(id, key),
    staleTime: GUEST_REPORT_REFRESH_MS,
    refetchInterval: ({ state }) => {
      const status = state.data?.report.status
      if (reportIsInaccessible(state.error) || status === "resolved" || status === "rejected") return false
      return GUEST_REPORT_REFRESH_MS
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => failureCount < 1 && !reportIsInaccessible(error),
  })
export const useKeyedReport = (id: string, key: string | null) =>
  useQuery({ ...keyedReportQuery(id, key ?? ""), enabled: Boolean(key) })

export const useDeviceReports = (enabled: boolean) =>
  useQuery({
    queryKey: ["reports", "device"],
    enabled,
    queryFn: async () => {
      const results = await Promise.allSettled(deviceReports().map((r) => fetchKeyed(r.id, r.key)))
      return results.flatMap((r) => (r.status === "fulfilled" ? [r.value.report] : []))
    },
  })

export const deviceKey = (id: string) => deviceReports().find((r) => r.id === id)?.key ?? null

export type StatusChange = { id: string; status: ReportsStatusOptions; comment?: string }

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

export function useChangeReportDuplicate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, parentId }: { id: string; parentId: string }) =>
      pb.collection("reports").update(id, { duplicate_of: parentId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports"] }),
  })
}

type PhotoAccess = { key?: string; token?: string }

export function useReportPhotoAccess(
  { status, duplicate_of }: Pick<ReportsResponse, "status" | "duplicate_of">,
  accessKey?: string | null,
): PhotoAccess | null {
  const { user } = useAuth()
  const isPrivate = Boolean(duplicate_of) || status === "new" || status === "rejected"
  const fileToken = useQuery({
    queryKey: ["report-photo-token", user?.id],
    queryFn: ({ signal }) => pb.files.getToken({ signal }),
    enabled: isPrivate && !accessKey && Boolean(user),
    // Keep lazy images and the link to the original usable before the two-minute token expires.
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
  if (!isPrivate) return {}
  if (accessKey) return { key: accessKey }
  return user && fileToken.data ? { token: fileToken.data } : null
}

// Only sizes listed in the photos field's `thumbs` are generated; any other size gets the original.
export const reportPhotoUrl = (
  report: ReportsResponse,
  file: string,
  thumb?: "160x160" | "640x0",
  access?: PhotoAccess,
) => pb.files.getURL(report, file, { ...(thumb ? { thumb } : {}), ...access })

const validationMessagesBe = new Map([
  ["outside_oblast", "Пункт па-за межамі Гомельскай вобласці."],
  ["validation_profanity", "Прыбярыце нецэнзурныя словы: зварот убачаць усе."],
  ["rejection_reason_required", "Пазначце прычыну адхілення."],
  ["duplicate_self", "Выберыце іншы зварот."],
  ["duplicate_has_children", "Спачатку скасуйце сувязь з дублікатамі гэтага звароту."],
  ["duplicate_not_found", "Асноўны зварот не знойдзены."],
  ["duplicate_invalid_parent", "Выберыце асноўны зварот, які не звязаны з іншым і не адхілены."],
  ["validation_required", "Запоўніце гэтае поле."],
  ["validation_length_out_of_range", "Праверце даўжыню ўведзенага значэння."],
  ["validation_values_mismatch", "Значэнні не супадаюць."],
  ["validation_file_size_limit", "Файл перавышае дапушчальны памер."],
])

export function fieldError(error: unknown, field: string): string | null {
  if (!(error instanceof ClientResponseError)) return null
  const data = error.response?.data as Record<string, { code?: string; message?: string }> | undefined
  const issue = data?.[field]
  if (isBelarusian && issue?.code) return validationMessagesBe.get(issue.code) ?? issue.message ?? null
  return issue?.message ?? null
}

export const errorStatus = (error: unknown) => (error instanceof ClientResponseError ? error.status : null)

export type ShowcaseReport = ReportWithDistrict & { resolvedAt: string | null }

export const showcaseQuery = () =>
  queryOptions({
    queryKey: ["reports", "showcase"],
    queryFn: async (): Promise<ShowcaseReport[]> => {
      const [reports, resolved] = await Promise.all([
        pb.collection("reports").getFullList<ReportWithDistrict>({
          filter: reportsFilter({ status: ["accepted", "forwarded", "resolved"], duplicates: "exclude" }),
          sort: "-created",
          expand: "district",
          fields: REPORT_DISTRICT_FIELDS,
        }),
        pb.collection("report_events").getFullList({
          filter: 'to_status = "resolved" && from_status != "resolved" && report.duplicate_of = ""',
          sort: "created",
        }),
      ])
      const resolvedAt = new Map(resolved.map((e) => [e.report, e.created]))
      return reports.map((r) => ({ ...r, resolvedAt: resolvedAt.get(r.id) ?? null }))
    },
    staleTime: 60_000,
    refetchInterval: PUBLIC_REPORT_REFRESH_MS,
  })
export const useShowcase = () => useQuery(showcaseQuery())
