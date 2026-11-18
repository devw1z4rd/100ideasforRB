import { Link } from "react-router"
import { deviceKey, reportPhotoUrl, type ReportWithDistrict } from "@/api/reports"
import type { ReportsStatusOptions } from "@/api/pocketbase-types"
import { categoryLabels, statusLabels } from "@/content/reports"
import { cn } from "@/lib/utils"

/** Цвет точки статуса — только токены; текст статуса всегда рядом (цвет не единственный признак) */
const statusDot: Record<ReportsStatusOptions, string> = {
  new: "bg-muted-foreground",
  accepted: "bg-(--link)",
  forwarded: "bg-aqi-moderate",
  resolved: "bg-success",
  rejected: "bg-destructive",
}

export function StatusBadge({ status, className }: { status: ReportsStatusOptions; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-2 rounded-full", statusDot[status])} />
      {statusLabels[status]}
    </span>
  )
}

/** «Речицкий район»; город Гомель — как есть */
export const districtLabel = (name: string | undefined) =>
  !name ? undefined : /^г\.|^Гомель$/.test(name) ? name : `${name} район`

/** Правдоподобность из автопроверки (только модераторам): цвет — уровень, текст — всегда рядом */
export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  const tone = score >= 70 ? "bg-success" : score >= 40 ? "bg-aqi-moderate" : "bg-destructive"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs whitespace-nowrap tabular-nums",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-2 rounded-full", tone)} />
      Похоже на правду: {score}%
    </span>
  )
}

/** Дата и время по Минску: «15 нояб., 14:32» */
export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("ru-RU", {
    timeZone: "Europe/Minsk",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })

/** Список обращений строками: категория и статус, район и дата, начало описания, первое фото */
export function ReportList({ reports, empty }: { reports: readonly ReportWithDistrict[]; empty: string }) {
  if (!reports.length) return <p className="py-10 text-muted-foreground">{empty}</p>
  return (
    <ul className="divide-y divide-border border-y border-border">
      {reports.map((r) => (
        <li key={r.id}>
          <Link
            to={deviceKey(r.id) ? `/reports/${r.id}?key=${deviceKey(r.id)}` : `/reports/${r.id}`}
            className="flex gap-4 py-4 transition-colors outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring md:px-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium">{categoryLabels[r.category]}</span>
                <StatusBadge status={r.status} />
                {r.auto_check && <ScoreBadge score={r.auto_check.score} />}
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground tabular-nums">
                {[districtLabel(r.expand?.district?.name), formatDateTime(r.created)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {r.description && (
                <p className="mt-1.5 line-clamp-2 text-sm text-fg-secondary">{r.description}</p>
              )}
            </div>
            {r.photos?.[0] && (
              <img
                src={reportPhotoUrl(r, r.photos[0])}
                alt=""
                loading="lazy"
                className={cn(
                  "size-16 shrink-0 rounded-lg object-cover md:size-20",
                  // Непроверенное (видно только автору и модератору) — превью размыто: на фото может быть что угодно
                  r.status === "new" && r.auto_check && "blur-md",
                )}
              />
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}
